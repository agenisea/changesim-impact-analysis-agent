# Claude Code Session Logging Protocol

## 🎯 Purpose
Preserve full fidelity conversation logs before Claude compacts context, ensuring complete technical documentation and decision trails.

## ⏰ Logging Schedule

### Automatic Triggers
- **Every 2 hours** of active development
- **Before major architecture changes** (e.g., new integrations, refactoring)
- **After completing significant milestones** (e.g., test suites passing, deployments)
- **Before context limits** (when approaching token boundaries)

### Manual Triggers
- User requests logging
- Before switching focus areas
- When encountering complex debugging sessions
- End of development sessions

## 📁 File Naming Convention

### Session Logs
```
claude-session-MM-DD-YYYY.prompt
```

Examples:
- `claude-session-01-23-2025.prompt` (complete session for the day)
- `claude-session-01-24-2025.prompt` (next day)
- `claude-session-01-25-2025.prompt` (following day)

## 🗂️ Directory Structure
```
/prompts/
  ├── claude-session-01-23-2025.prompt    # Complete session for Jan 23
  ├── claude-session-01-24-2025.prompt    # Complete session for Jan 24
  └── claude-prompt-history-*.prompt      # Legacy format (deprecated)
```

## 📝 Log Content Format

### Single Session File (`claude-session-MM-DD-YYYY.prompt`)
```
# claude-session-MM-DD-YYYY.prompt
# defined: MM-DD-YYYY

This file contains the complete session log for MM-DD-YYYY.

================================================================================
SESSION OVERVIEW
================================================================================
Focus: [Brief description of session goals]
Duration: [Start - End time if known]
Major Achievements: [Key accomplishments]

================================================================================
FULL CONVERSATION
================================================================================
[Complete conversation with all prompts, responses, and technical context]

================================================================================
FILES MODIFIED
================================================================================
[Complete list of files created/modified with descriptions]

================================================================================
TECHNICAL DECISIONS
================================================================================
[Key architecture and implementation decisions with rationale]

================================================================================
NEXT STEPS
================================================================================
[Current state, blockers, planned follow-ups]
```

## 🔧 Implementation Commands

### Quick Session Export
```bash
# Export current session (to be run by Claude)
echo "Exporting session $(date +%m-%d-%Y)..."
# Creates single .prompt file for the day
```

## 🎯 Best Practices

### During Development
1. **Set 2-hour reminders** for automatic exports
2. **Export before major refactoring** or architectural changes
3. **Export after test suite completion** to capture debugging process
4. **Export when switching between features** to maintain context boundaries

### Content Guidelines
1. **Include complete conversation** - all prompts, responses, and technical context
2. **Preserve error messages and debugging steps** - valuable for future reference
3. **Document architecture evolution** - why certain patterns were chosen
4. **Capture user feedback and responses** - shows iterative improvement process
5. **One file per day** - append to existing file if multiple sessions occur same day

### Security Considerations
1. **Scrub sensitive data** before logging (API keys, passwords, real org names)
2. **Use generic examples** in logs (keep actual user data private)
3. **Mark confidential sections** if needed for internal reference

## 📊 Benefits

### For Development
- **Complete audit trail** of technical decisions
- **Debugging reference** for similar issues
- **Architecture evolution documentation**
- **Learning resource** for complex implementations

### For Collaboration
- **Onboarding material** for new team members
- **Context preservation** across multiple sessions
- **Knowledge transfer** documentation
- **Portfolio evidence** of problem-solving approach

### For Research
- **Methodology documentation** for reproducible results
- **Decision rationale** for academic papers
- **Implementation details** for open source contributions
- **Process improvement** insights

## 🚀 Automation Opportunities

### Future Enhancements
1. **GitHub Actions** for automatic session archival
2. **Slack/Discord webhooks** for session completion notifications
3. **Automated consolidation** scripts for daily/weekly summaries
4. **Search indexing** for technical decision lookup

### Integration Points
1. **Git commit hooks** - export before major commits
2. **CI/CD pipelines** - archive logs with deployments
3. **Issue tracking** - link logs to GitHub issues
4. **Documentation sites** - auto-generate from session logs

---

## 📋 Quick Reference Checklist

### Every 2 Hours:
- [ ] Export current session to dated .txt file
- [ ] Create corresponding .prompt file
- [ ] Note current focus and next steps
- [ ] Check for sensitive data to scrub

### End of Day:
- [ ] Consolidate all daily sessions
- [ ] Create summary of major achievements
- [ ] Archive in appropriate directory
- [ ] Update project documentation with key decisions

### Start of New Session:
- [ ] Reference previous session logs for context
- [ ] Note continuation points and blockers
- [ ] Set 2-hour export reminder
- [ ] Identify session focus area

This protocol ensures no technical context is ever lost and creates a comprehensive development history for future reference and learning.