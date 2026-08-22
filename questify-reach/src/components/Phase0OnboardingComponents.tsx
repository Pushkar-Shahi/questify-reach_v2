/**
 * PHASE 0.5 - Empty State Onboarding Prompts
 *
 * Replaces dead-end empty states with actionable nudges.
 * Instead of "No topics yet", users see a guided onboarding path.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Sparkles,
  Zap,
  BookOpen,
  Target,
  ChevronRight,
} from "lucide-react";

// ============================================================================
// EMPTY STATE COMPONENTS
// ============================================================================

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  variant?: "default" | "highlight" | "warning";
  suggestedActions?: Array<{
    label: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
  }>;
}

export function EmptyStateOnboarding({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  variant = "default",
  suggestedActions,
}: EmptyStateProps) {
  const variants = {
    default: "from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800",
    highlight: "from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-900",
    warning: "from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-900",
  };

  return (
    <div
      className={`
        rounded-lg border border-gray-200 dark:border-gray-700
        bg-gradient-to-br ${variants[variant]}
        p-8 text-center
      `}
    >
      {/* Icon */}
      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/60 dark:bg-gray-800/60">
        {icon}
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>

      {/* Primary Action */}
      <Button
        onClick={onAction}
        className="mb-6"
        size="lg"
      >
        {actionLabel}
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>

      {/* Suggested Actions */}
      {suggestedActions && suggestedActions.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-4">
            Quick Start
          </p>
          <div className="grid gap-3">
            {suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={action.onClick}
                className="flex items-start gap-3 rounded-lg p-3 text-left hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-shrink-0 text-lg">{action.icon}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {action.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SPECIFIC EMPTY STATE TEMPLATES
// ============================================================================

interface NoTasksEmptyStateProps {
  onAddTask: () => void;
}

export function NoTasksEmptyState({ onAddTask }: NoTasksEmptyStateProps) {
  return (
    <EmptyStateOnboarding
      title="No tasks yet"
      description="Start your journey by adding your first daily target. Complete it to earn points and build your streak!"
      icon={<Target className="h-8 w-8 text-amber-600" />}
      actionLabel="Add Your First Task"
      onAction={onAddTask}
      variant="highlight"
      suggestedActions={[
        {
          label: "Quick task",
          description: "Something you can do right now",
          icon: "⚡",
          onClick: onAddTask,
        },
        {
          label: "Study session",
          description: "Block time for focused learning",
          icon: "📚",
          onClick: onAddTask,
        },
        {
          label: "Review topic",
          description: "Practice something you learned before",
          icon: "🔄",
          onClick: onAddTask,
        },
      ]}
    />
  );
}

interface NoCareerTopicsEmptyStateProps {
  onAddTopic: () => void;
  onViewSkillTree: () => void;
}

export function NoCareerTopicsEmptyState({
  onAddTopic,
  onViewSkillTree,
}: NoCareerTopicsEmptyStateProps) {
  return (
    <EmptyStateOnboarding
      title="Build your learning roadmap"
      description="Add career topics to track your progress toward your career goals. Or browse our curated skill trees to get started fast."
      icon={<BookOpen className="h-8 w-8 text-blue-600" />}
      actionLabel="Start with Skill Tree"
      onAction={onViewSkillTree}
      variant="default"
      suggestedActions={[
        {
          label: "Backend Engineer",
          description: "Master server-side development",
          icon: "⚙️",
          onClick: onViewSkillTree,
        },
        {
          label: "Data Analyst",
          description: "Learn data analysis & visualization",
          icon: "📊",
          onClick: onViewSkillTree,
        },
        {
          label: "Custom path",
          description: "Create your own learning goals",
          icon: "🎯",
          onClick: onAddTopic,
        },
      ]}
    />
  );
}

interface NoActivityEmptyStateProps {
  onAddTask: () => void;
}

export function NoActivityEmptyState({ onAddTask }: NoActivityEmptyStateProps) {
  return (
    <EmptyStateOnboarding
      title="Your activity log is empty"
      description="Complete your first task to start building your activity history. Every action counts!"
      icon={<Zap className="h-8 w-8 text-amber-600" />}
      actionLabel="Complete Your First Task"
      onAction={onAddTask}
      variant="warning"
      suggestedActions={[
        {
          label: "Get a task",
          description: "Find something to work on now",
          icon: "✅",
          onClick: onAddTask,
        },
        {
          label: "View your goals",
          description: "See what you're working towards",
          icon: "🎯",
          onClick: () => {},
        },
        {
          label: "Learn by doing",
          description: "Start practicing right away",
          icon: "💪",
          onClick: onAddTask,
        },
      ]}
    />
  );
}

interface NoIdentityEmptyStateProps {
  onSelectIdentity: () => void;
}

export function NoIdentityEmptyState({ onSelectIdentity }: NoIdentityEmptyStateProps) {
  return (
    <EmptyStateOnboarding
      title="Who are you becoming?"
      description="Choose your career identity to personalize your learning path. This helps us recommend relevant topics and celebrate your progress."
      icon={<Sparkles className="h-8 w-8 text-purple-600" />}
      actionLabel="Select Your Identity"
      onAction={onSelectIdentity}
      variant="highlight"
      suggestedActions={[
        {
          label: "Backend Engineer",
          description: "Server-side development & systems",
          icon: "⚙️",
          onClick: onSelectIdentity,
        },
        {
          label: "Data Analyst",
          description: "Data-driven insights & visualization",
          icon: "📊",
          onClick: onSelectIdentity,
        },
        {
          label: "Full-Stack Engineer",
          description: "Both frontend and backend mastery",
          icon: "🔗",
          onClick: onSelectIdentity,
        },
      ]}
    />
  );
}

// ============================================================================
// PROGRESS-BASED ONBOARDING HINTS
// ============================================================================

interface OnboardingHintProps {
  message: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function OnboardingHint({ message, icon, action }: OnboardingHintProps) {
  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950 p-4 flex items-start gap-3">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          {message}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2 hover:underline"
          >
            {action.label} →
          </button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// ONBOARDING PROGRESS TRACKER
// ============================================================================

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  action?: () => void;
}

interface OnboardingProgressProps {
  steps: OnboardingStep[];
  currentStep?: string;
}

export function OnboardingProgress({ steps, currentStep }: OnboardingProgressProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
      {/* Header */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
          Onboarding Progress
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {completedCount} of {steps.length} steps complete
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={step.action}
            className={`
              w-full text-left p-3 rounded-lg transition-all
              ${
                step.completed
                  ? "bg-green-100 dark:bg-green-900/30"
                  : currentStep === step.id
                    ? "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${
                    step.completed
                      ? "bg-green-500 text-white"
                      : currentStep === step.id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                  }
                `}
              >
                {step.completed ? "✓" : step.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
