/**
 * PHASE 5 - Skill Tree React Components
 *
 * Components:
 * 1. SkillTreeVisualization - Interactive node graph
 * 2. SkillCard - Individual skill details
 * 3. SkillNode - Clickable tree node
 * 4. TrackSelector - Choose a career track
 * 5. SkillPreview - Modal to show skill details
 */

import React, { useState } from \"react\";
import { useSkillTrack, useStartSkill, useCompleteSkill, getSkillUnlockInfo, SkillNode, SkillTrack } from \"@/lib/phase5-skill-trees\";
import { Button } from \"@/components/ui/button\";
import { Card } from \"@/components/ui/card\";
import { Badge } from \"@/components/ui/badge\";
import { CheckCircle2, Lock, Play, ExternalLink } from \"lucide-react\";

// ============================================================================
// SKILL TREE VISUALIZATION (Main Component)
// ============================================================================

interface SkillTreeVisualizationProps {
  userId: string;
  trackTitle: string;
  onSkillClick?: (skill: SkillNode) => void;
}

export function SkillTreeVisualization({
  userId,
  trackTitle,
  onSkillClick,
}: SkillTreeVisualizationProps) {
  const { data: track, isLoading } = useSkillTrack(userId, trackTitle);
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);

  if (isLoading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"text-gray-500\">Loading skill tree...</div>
      </div>
    );
  }

  if (!track) {
    return <div className=\"text-red-500\">Track not found</div>;
  }

  const handleSkillClick = (skill: SkillNode) => {
    setSelectedSkill(skill);
    onSkillClick?.(skill);
  };

  return (
    <div className=\"w-full\">
      {/* Header */}
      <div className=\"mb-6\">
        <div className=\"flex items-center gap-3 mb-2\">
          <span className=\"text-3xl\">{track.emoji}</span>
          <h2 className=\"text-2xl font-bold\">{track.title}</h2>
        </div>
        <p className=\"text-gray-600 dark:text-gray-400 max-w-xl\">{track.description}</p>
      </div>

      {/* Tree Container */}
      <div className=\"relative bg-gray-50 dark:bg-gray-900 rounded-lg p-6 overflow-x-auto min-h-96\">
        <svg className=\"absolute inset-0\" width=\"100%\" height=\"100%\" style={{ pointerEvents: \"none\" }}>
          {/* Draw connections */}
          {track.layout?.connections.map((conn: any, idx: number) => {
            const fromSkill = track.layout.skills.find((s: any) => s.skill.id === conn.from_skill_id);
            const toSkill = track.layout.skills.find((s: any) => s.skill.id === conn.to_skill_id);

            if (!fromSkill || !toSkill) return null;

            return (
              <line
                key={idx}
                x1={fromSkill.x + 60}
                y1={fromSkill.y + 60}
                x2={toSkill.x + 60}
                y2={toSkill.y + 60}
                stroke=\"#d1d5db\"
                strokeWidth=\"2\"
                markerEnd=\"url(#arrowhead)\"
              />
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker id=\"arrowhead\" markerWidth=\"10\" markerHeight=\"10\" refX=\"9\" refY=\"3\" orient=\"auto\">
              <polygon points=\"0 0, 10 3, 0 6\" fill=\"#d1d5db\" />
            </marker>
          </defs>
        </svg>

        {/* Skill nodes */}
        <div className=\"relative z-10\">
          {track.layout?.skills.map((item: any) => (
            <SkillNodeComponent
              key={item.skill.id}
              skill={item.skill}
              progress={item.userProgress}
              x={item.x}
              y={item.y}
              onClick={() => handleSkillClick(item.skill)}
            />
          ))}
        </div>
      </div>

      {/* Skill Detail Panel */}
      {selectedSkill && (
        <SkillDetail
          userId={userId}
          skill={selectedSkill}
          track={track}
          onClose={() => setSelectedSkill(null)}
        />
      )}

      {/* Legend */}
      <div className=\"mt-6 flex gap-4 flex-wrap text-sm\">
        <div className=\"flex items-center gap-2\">
          <div className=\"w-4 h-4 rounded bg-green-100 border-2 border-green-500\" />
          <span>Completed</span>
        </div>
        <div className=\"flex items-center gap-2\">
          <div className=\"w-4 h-4 rounded bg-blue-100 border-2 border-blue-500\" />
          <span>In Progress</span>
        </div>
        <div className=\"flex items-center gap-2\">
          <div className=\"w-4 h-4 rounded bg-amber-100 border-2 border-amber-500\" />
          <span>Available</span>
        </div>
        <div className=\"flex items-center gap-2\">
          <div className=\"w-4 h-4 rounded bg-gray-100 border-2 border-gray-400\" />
          <span>Locked</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SKILL NODE (Clickable Tree Node)
// ============================================================================

interface SkillNodeComponentProps {
  skill: SkillNode;
  progress: any;
  x: number;
  y: number;
  onClick: () => void;
}

function SkillNodeComponent({ skill, progress, x, y, onClick }: SkillNodeComponentProps) {
  const status = progress?.status || \"locked\";

  const statusColors = {
    completed: \"bg-green-100 dark:bg-green-900 border-green-500\",
    in_progress: \"bg-blue-100 dark:bg-blue-900 border-blue-500\",
    available: \"bg-amber-100 dark:bg-amber-900 border-amber-500\",
    locked: \"bg-gray-100 dark:bg-gray-800 border-gray-400\",
  };

  const difficultyEmoji = {
    beginner: \"🟢\",
    intermediate: \"🟡\",
    advanced: \"🔴\",
    expert: \"⚫\",
  };

  return (
    <button
      onClick={onClick}
      className={`
        absolute w-28 p-3 rounded-lg border-2 text-center
        transition-all hover:shadow-lg
        ${statusColors[status as keyof typeof statusColors]}
        ${status === \"locked\" ? \"opacity-60 cursor-not-allowed\" : \"cursor-pointer\"}
      `}
      style={{ left: `${x}px`, top: `${y}px` }}
      disabled={status === \"locked\"}
    >
      {/* Status Icon */}
      <div className=\"flex justify-center mb-2\">
        {status === \"completed\" && <CheckCircle2 className=\"w-5 h-5 text-green-600\" />}
        {status === \"in_progress\" && <Play className=\"w-5 h-5 text-blue-600\" />}
        {status === \"locked\" && <Lock className=\"w-5 h-5 text-gray-600\" />}
        {status === \"available\" && <span className=\"text-lg\">{skill.emoji}</span>}
      </div>

      {/* Title */}
      <div className=\"text-xs font-bold line-clamp-2 mb-1\">{skill.title}</div>

      {/* Difficulty */}
      <div className=\"text-xs\">{difficultyEmoji[skill.difficulty]}</div>

      {/* Progress Bar */}
      {status === \"in_progress\" && (
        <div className=\"mt-2 w-full bg-gray-300 rounded h-1\">
          <div
            className=\"bg-blue-500 h-1 rounded\"
            style={{ width: `${progress?.progress_percent || 0}%` }}
          />
        </div>
      )}
    </button>
  );
}

// ============================================================================
// SKILL DETAIL PANEL
// ============================================================================

interface SkillDetailProps {
  userId: string;
  skill: SkillNode;
  track: SkillTrack;
  onClose: () => void;
}

function SkillDetail({ userId, skill, track, onClose }: SkillDetailProps) {
  const startSkill = useStartSkill(userId);
  const completeSkill = useCompleteSkill(userId);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unlock info
  const unlockInfo = getSkillUnlockInfo(skill.id, track.skills, new Map());

  const difficultyColor = {
    beginner: \"bg-green-100 text-green-800\",
    intermediate: \"bg-yellow-100 text-yellow-800\",
    advanced: \"bg-orange-100 text-orange-800\",
    expert: \"bg-red-100 text-red-800\",
  };

  return (
    <div className=\"fixed inset-0 bg-black/50 flex items-center justify-center z-50\">
      <Card className=\"max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto\">
        {/* Close button */}
        <button
          onClick={onClose}
          className=\"absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded\"
        >
          ✕
        </button>

        <div className=\"p-6\">
          {/* Header */}
          <div className=\"mb-4\">
            <div className=\"flex items-start gap-3 mb-3\">
              <span className=\"text-4xl\">{skill.emoji}</span>
              <div>
                <h3 className=\"text-xl font-bold\">{skill.title}</h3>
                <Badge className={difficultyColor[skill.difficulty]}>
                  {skill.difficulty.charAt(0).toUpperCase() + skill.difficulty.slice(1)}
                </Badge>
              </div>
            </div>
            <p className=\"text-sm text-gray-600 dark:text-gray-400\">{skill.description}</p>
          </div>

          {/* Meta Info */}
          <div className=\"mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded flex gap-4 text-sm\">
            <div>
              <div className=\"font-semibold\">⏱️ {skill.estimated_days} days</div>
              <div className=\"text-xs text-gray-600\">Estimated time</div>
            </div>
          </div>

          {/* Prerequisites */}
          {skill.prerequisite_skill_ids && skill.prerequisite_skill_ids.length > 0 && (
            <div className=\"mb-4\">
              <h4 className=\"font-semibold text-sm mb-2\">Prerequisites</h4>
              <div className=\"space-y-2\">
                {unlockInfo.completedPrerequisites.map((prereq) => (
                  <div key={prereq.id} className=\"flex items-center gap-2 text-sm\">
                    <CheckCircle2 className=\"w-4 h-4 text-green-600\" />
                    <span>{prereq.title}</span>
                  </div>
                ))}
                {unlockInfo.nextPrerequisites.map((prereq) => (
                  <div key={prereq.id} className=\"flex items-center gap-2 text-sm text-gray-500\">
                    <Lock className=\"w-4 h-4\" />
                    <span>{prereq.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          <div className=\"mb-4\">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className=\"font-semibold text-sm flex items-center gap-2 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded\"
            >
              📚 Resources ({skill.resources?.length || 0})
            </button>
            {isExpanded && (
              <div className=\"mt-2 space-y-2\">
                {skill.resources?.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.url}
                    target=\"_blank\"
                    rel=\"noopener noreferrer\"
                    className=\"flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900 rounded hover:bg-blue-100 dark:hover:bg-blue-800 text-sm text-blue-600 dark:text-blue-300\"
                  >
                    <span>{resource.title}</span>
                    <ExternalLink className=\"w-3 h-3\" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className=\"flex gap-2\">
            <Button
              onClick={() => startSkill.mutate(skill.id)}
              className=\"flex-1\"
              disabled={!unlockInfo.isUnlocked}
            >
              Start Learning
            </Button>
            <Button
              onClick={() => completeSkill.mutate(skill.id)}
              variant=\"outline\"
              className=\"flex-1\"
            >
              Mark Complete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// TRACK SELECTOR (Choose Career Path)
// ============================================================================

interface TrackSelectorProps {
  onSelectTrack: (trackTitle: string) => void;
  selectedTrack?: string;
}

export function TrackSelector({ onSelectTrack, selectedTrack }: TrackSelectorProps) {
  const tracks = [
    { title: \"Backend Engineer\", emoji: \"⚙️\", color: \"from-blue-400 to-blue-600\" },
    { title: \"Data Analyst\", emoji: \"📊\", color: \"from-green-400 to-emerald-600\" },
  ];

  return (
    <div className=\"grid grid-cols-2 gap-4\">
      {tracks.map((track) => (
        <button
          key={track.title}
          onClick={() => onSelectTrack(track.title)}
          className={`
            p-6 rounded-lg border-2 transition-all
            ${
              selectedTrack === track.title
                ? \"border-amber-500 bg-amber-50 dark:bg-amber-950\"
                : \"border-gray-200 dark:border-gray-700 hover:border-amber-300\"
            }
          `}
        >
          <div className=\"text-4xl mb-2\">{track.emoji}</div>
          <div className=\"font-bold text-sm\">{track.title}</div>
        </button>
      ))}
    </div>
  );
}
