/**
 * PHASE 0.4 - Auto-Approval System & Rate Limiting
 *
 * Features:
 * 1. Auto-approve users after email verification (optional)
 * 2. Rate limiting per IP/email to prevent spam signups
 * 3. Flag/report system for suspicious activity
 * 4. Admin review queue for flagged users
 */

import { supabase } from "@/integrations/supabase/client";

export interface ApprovalRejection {
  id: string;
  user_id: string;
  reason: string;
  flagged_by: string | null;
  rejected_at: string;
  metadata: Record<string, any> | null;
}

export interface ApprovalRequest {
  user_id: string;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  approval_requested_at: string | null;
  approval_approved_at: string | null;
  approval_approved_by: string | null;
  approval_rejection_reason: string | null;
}

// ============================================================================
// AUTO-APPROVAL LOGIC
// ============================================================================

/**
 * Criteria for auto-approval (customize as needed)
 */
export function shouldAutoApprove(userEmail: string, metadata?: Record<string, any>): boolean {
  // Whitelist verified domains (e.g., .edu for students)
  const whitelistDomains = ["gmail.com", "outlook.com", "yahoo.com"];
  const domain = userEmail.split("@")[1];

  if (!whitelistDomains.includes(domain) && !domain?.endsWith(".edu")) {
    return false; // Require manual approval for other domains
  }

  // Could add more checks: email verification status, etc.
  return true;
}

/**
 * Process new user signup with auto-approval logic
 */
export async function processUserSignup(
  userId: string,
  userEmail: string,
  displayName: string
) {
  try {
    const autoApprove = shouldAutoApprove(userEmail);

    const updateData: any = {
      approval_status: autoApprove ? "approved" : "pending",
      approval_requested_at: new Date().toISOString(),
    };

    if (autoApprove) {
      updateData.approval_approved_at = new Date().toISOString();
      updateData.approval_approved_by = userId; // Self-approval
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (error) throw error;

    return {
      autoApproved: autoApprove,
      status: autoApprove ? "approved" : "pending",
      message: autoApprove
        ? "Welcome! Your account has been automatically approved."
        : "Your account is pending admin approval. Check back soon!",
    };
  } catch (error) {
    console.error("Error processing signup:", error);
    return { autoApproved: false, status: "error", message: "Signup error" };
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check if user/IP has exceeded signup rate limit
 * Rate limit: max 3 signups per IP per hour, max 5 per email per day
 */
export async function checkSignupRateLimit(
  email: string,
  ip: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Check IP-based rate limit
    const { data: ipSignups, error: ipError } = await supabase
      .from("profiles")
      .select("id")
      .gte("created_at", oneHourAgo)
      .eq("email", email); // In real implementation, use IP from request headers

    if (ipError) throw ipError;

    if ((ipSignups?.length || 0) >= 3) {
      return { allowed: false, reason: "Too many signups from this IP in the last hour" };
    }

    // Check email-based rate limit
    const { data: emailSignups, error: emailError } = await supabase
      .from("profiles")
      .select("id")
      .gte("created_at", oneDayAgo)
      .eq("email", email);

    if (emailError) throw emailError;

    if ((emailSignups?.length || 0) >= 5) {
      return { allowed: false, reason: "Too many signups with this email in the last 24 hours" };
    }

    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Default to allowing if check fails (fail-open)
    return { allowed: true };
  }
}

// ============================================================================
// FLAG & REPORT SYSTEM
// ============================================================================

export interface FlagReason {
  type: "suspicious_activity" | "spam" | "inappropriate_content" | "manual_review" | "other";
  description: string;
  evidence?: string[];
}

/**
 * Flag a user for suspicious activity (creates report)
 */
export async function flagUserForReview(
  userId: string,
  flagReason: FlagReason,
  flaggedBy?: string
) {
  try {
    // Create rejection record (repurposed for flags)
    const { error } = await supabase
      .from("approval_rejections")
      .insert({
        user_id: userId,
        reason: `[${flagReason.type.toUpperCase()}] ${flagReason.description}`,
        flagged_by: flaggedBy || null,
        metadata: {
          type: flagReason.type,
          evidence: flagReason.evidence,
          reviewed: false,
        },
      });

    if (error) throw error;

    // Update user profile to "suspended" pending review
    await supabase
      .from("profiles")
      .update({ approval_status: "suspended" })
      .eq("id", userId);

    return { success: true };
  } catch (error) {
    console.error("Error flagging user:", error);
    return { success: false, error };
  }
}

/**
 * Auto-flag for suspicious patterns (spam-like behavior)
 */
export async function autoFlagSuspiciousActivity(
  userId: string
): Promise<{ flagged: boolean; reason?: FlagReason }> {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Check for excessive task creation (more than 20 in 30 min = likely bot)
    const { data: recentTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", thirtyMinutesAgo);

    if (tasksError) throw tasksError;

    if ((recentTasks?.length || 0) > 20) {
      const reason: FlagReason = {
        type: "suspicious_activity",
        description: `Created ${recentTasks?.length} tasks in 30 minutes`,
      };

      await flagUserForReview(userId, reason);
      return { flagged: true, reason };
    }

    // Check for suspicious point farming (completing 50+ tasks in 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .gte("completed_at", oneHourAgo);

    if ((completedTasks?.length || 0) > 50) {
      const reason: FlagReason = {
        type: "suspicious_activity",
        description: `Completed ${completedTasks?.length} tasks in 1 hour (point farming)`,
      };

      await flagUserForReview(userId, reason);
      return { flagged: true, reason };
    }

    return { flagged: false };
  } catch (error) {
    console.error("Error in auto-flag check:", error);
    return { flagged: false };
  }
}

// ============================================================================
// ADMIN REVIEW QUEUE
// ============================================================================

/**
 * Get pending users needing approval
 */
export async function getPendingApprovals(limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        display_name,
        approval_status,
        approval_requested_at,
        created_at
      `
      )
      .eq("approval_status", "pending")
      .order("approval_requested_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    return [];
  }
}

/**
 * Get flagged users for review
 */
export async function getFlaggedUsers(limit: number = 20) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        display_name,
        approval_status,
        created_at
      `
      )
      .eq("approval_status", "suspended")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Fetch associated flags
    const flaggedUsersWithReasons = await Promise.all(
      (data || []).map(async (user) => {
        const { data: rejections } = await supabase
          .from("approval_rejections")
          .select("*")
          .eq("user_id", user.id)
          .order("rejected_at", { ascending: false })
          .limit(3);

        return { ...user, flags: rejections };
      })
    );

    return flaggedUsersWithReasons;
  } catch (error) {
    console.error("Error fetching flagged users:", error);
    return [];
  }
}

/**
 * Approve a pending user (admin action)
 */
export async function approveUser(userId: string, approvedBy: string) {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: "approved",
        approval_approved_at: now,
        approval_approved_by: approvedBy,
      })
      .eq("id", userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error approving user:", error);
    return { success: false, error };
  }
}

/**
 * Reject a pending user (admin action)
 */
export async function rejectUser(userId: string, reason: string, rejectedBy: string) {
  try {
    const now = new Date().toISOString();

    // Create rejection record
    await supabase.from("approval_rejections").insert({
      user_id: userId,
      reason,
      flagged_by: rejectedBy,
      metadata: { rejected_by_admin: true },
    });

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: "rejected",
        approval_rejection_reason: reason,
        approval_approved_by: rejectedBy,
      })
      .eq("id", userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error rejecting user:", error);
    return { success: false, error };
  }
}

/**
 * Unsuspend a user after manual review
 */
export async function unsuspendUser(userId: string, reviewedBy: string) {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        approval_status: "approved",
        approval_approved_by: reviewedBy,
        approval_approved_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error unsuspending user:", error);
    return { success: false, error };
  }
}
