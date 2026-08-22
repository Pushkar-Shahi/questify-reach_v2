/**
 * PHASE 1 - React Components
 *
 * Components:
 * 1. CareerIdentitySelector - Signup/settings identity selection
 * 2. UserBadgeDisplay - Show earned badges
 * 3. StreakChain - Visual chain graphic for streak (loss-aversion design)
 * 4. IdentityCard - User identity card with emoji
 */

import React, { useState } from "react";
import { useUpdateIdentity, CAREER_IDENTITIES, CareerIdentity } from "@/lib/phase1-identity";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// CAREER IDENTITY SELECTOR
// ============================================================================

interface CareerIdentitySelectorProps {
  onSelect: (identity: CareerIdentity) => void;
  currentIdentity?: CareerIdentity | null;
  mode?: "signup" | "settings";
}

export function CareerIdentitySelector({
  onSelect,
  currentIdentity,
  mode = "settings",
}: CareerIdentitySelectorProps) {
  const identities = Object.entries(CAREER_IDENTITIES) as Array<
    [CareerIdentity, { emoji: string; color: string }]
  >;

  return (
    <div className="w-full max-w-2xl">
      <div className={mode === "signup" ? "mb-6" : "mb-4"}>
        <h2 className="text-xl font-semibold mb-2">
          {mode === "signup" ? "What's your career identity?" : "Update your identity"}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mode === "signup"
            ? "Choose what resonates with you. This helps personalize your learning path."
            : "This helps tailor your experience and recommended topics."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {identities.map(([identity, config]) => (
          <button
            key={identity}
            onClick={() => onSelect(identity)}
            className={`
              relative p-4 rounded-lg border-2 transition-all
              ${
                currentIdentity === identity
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-amber-300"
              }
            `}
          >
            <div className="text-2xl mb-2">{config.emoji}</div>
            <div className="text-xs font-medium line-clamp-2">{identity}</div>
            {currentIdentity === identity && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STREAK CHAIN VISUALIZATION (Loss-Aversion Design)
// ============================================================================

interface StreakChainProps {
  streakDays: number;
  lastActivityDate?: string | null;
  isAtRisk?: boolean;
  hoursUntilBreak?: number;
}

/**
 * Visual chain graphic - each link represents a day
 * Breaking the chain is more visceral than just seeing "5 -> 0"
 */
export function StreakChain({
  streakDays,
  lastActivityDate,
  isAtRisk = false,
  hoursUntilBreak,
}: StreakChainProps) {
  const MAX_VISIBLE_LINKS = 14; // Show ~2 weeks of chain
  const visibleLinks = Math.min(streakDays, MAX_VISIBLE_LINKS);
  const hiddenLinksText = streakDays > MAX_VISIBLE_LINKS ? `+${streakDays - MAX_VISIBLE_LINKS}` : null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Current Streak</h3>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{streakDays} days</p>
        </div>
        {isAtRisk && hoursUntilBreak && (
          <div className="text-right">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">⚠️ At Risk</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              {hoursUntilBreak} hours left
            </p>
          </div>
        )}
      </div>

      {/* Chain visualization */}
      <div className="flex flex-wrap gap-2 items-center">
        {Array.from({ length: visibleLinks }).map((_, i) => (
          <ChainLink
            key={i}
            index={i}
            totalLinks={visibleLinks}
            isAtRisk={isAtRisk && i === 0} // First link (most recent) at risk
          />
        ))}

        {hiddenLinksText && (
          <div className="px-2 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 ml-2">
            {hiddenLinksText}
          </div>
        )}

        {streakDays === 0 && (
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-gray-600 dark:text-gray-400">
            Complete a task to start your streak!
          </div>
        )}
      </div>

      {/* Motivation text */}
      {streakDays > 0 && (
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          {streakDays < 7
            ? `${7 - streakDays} days until "Consistent" badge! 🎯`
            : streakDays < 30
              ? `${30 - streakDays} days until "Streak Master" badge! ⚡`
              : `You're unstoppable! Keep it going! 🔥`}
        </p>
      )}
    </div>
  );
}

interface ChainLinkProps {
  index: number;
  totalLinks: number;
  isAtRisk?: boolean;
}

function ChainLink({ index, totalLinks, isAtRisk = false }: ChainLinkProps) {
  // Opacity gradient - more recent links are brighter
  const opacityFactor = (index + 1) / totalLinks;
  const opacity = 0.5 + opacityFactor * 0.5; // 0.5 to 1.0

  return (
    <div
      className={`
        w-8 h-8 rounded border-2 flex items-center justify-center text-xs font-bold
        transition-all
        ${
          isAtRisk
            ? "bg-red-100 dark:bg-red-950 border-red-400 dark:border-red-600 animate-pulse"
            : "bg-amber-100 dark:bg-amber-950 border-amber-400 dark:border-amber-600"
        }
      `}
      style={{ opacity }}
      title={`Day ${totalLinks - index}`}
    >
      🔗
    </div>
  );
}

// ============================================================================
// USER BADGE DISPLAY
// ============================================================================

import { BADGE_DEFINITIONS, BadgeType } from "@/lib/phase1-identity";

interface UserBadgeDisplayProps {
  badges: Array<{ type: BadgeType; metadata?: Record<string, any> }>;
  size?: "sm" | "md" | "lg";
}

export function UserBadgeDisplay({ badges, size = "md" }: UserBadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Complete tasks to earn badges! 🏆
      </div>
    );
  }

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-lg",
  };

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, idx) => {
        const def = BADGE_DEFINITIONS[badge.type];
        return (
          <div
            key={`${badge.type}-${idx}`}
            className="group relative"
            title={def.description}
          >
            <div
              className={`
                ${sizeClasses[size]}
                bg-gradient-to-br from-amber-100 to-orange-100
                dark:from-amber-900 dark:to-orange-900
                rounded-full flex items-center justify-center
                border border-amber-300 dark:border-amber-700
                shadow-sm
              `}
            >
              {def.emoji}
            </div>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded px-2 py-1 whitespace-nowrap">
                {def.title}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// IDENTITY CARD
// ============================================================================

interface IdentityCardProps {
  name: string;
  emoji: string;
  onEdit?: () => void;
  badges?: Array<{ type: BadgeType }>;
  editable?: boolean;
}

export function IdentityCard({ name, emoji, onEdit, badges = [], editable = false }: IdentityCardProps) {
  return (
    <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 mb-1">
            Career Identity
          </p>
          <p className="text-2xl font-bold flex items-center gap-2">
            <span>{emoji}</span>
            <span className="text-gray-900 dark:text-white">{name}</span>
          </p>
          {badges.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Badges:</p>
              <UserBadgeDisplay badges={badges} size="sm" />
            </div>
          )}
        </div>
        {editable && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-amber-600 border-amber-300 hover:bg-amber-100"
          >
            Edit
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// STREAK AT-RISK NOTIFICATION
// ============================================================================

interface StreakAtRiskNotificationProps {
  streakDays: number;
  hoursUntilBreak: number;
  onTaskClick?: () => void;
}

export function StreakAtRiskNotification({
  streakDays,
  hoursUntilBreak,
  onTaskClick,
}: StreakAtRiskNotificationProps) {
  if (hoursUntilBreak > 3) {
    return null; // Only show when < 3 hours left
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm animate-pulse">
      <Card className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 border-0 shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h4 className="font-bold mb-1">Your {streakDays}-day streak is at risk!</h4>
            <p className="text-sm opacity-90">
              {hoursUntilBreak === 0
                ? "Complete a task in the next hour to save it!"
                : `Only ${hoursUntilBreak} hour${hoursUntilBreak === 1 ? "" : "s"} left!`}
            </p>
          </div>
          {onTaskClick && (
            <Button
              onClick={onTaskClick}
              size="sm"
              variant="secondary"
              className="whitespace-nowrap"
            >
              Do a task
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
