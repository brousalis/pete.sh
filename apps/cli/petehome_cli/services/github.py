"""GitHub CLI integration service."""

import asyncio
import json
import sys
from dataclasses import dataclass
from datetime import datetime

from petehome_cli.config import REPO_ROOT


# On Windows, commands need shell execution
IS_WINDOWS = sys.platform == "win32"


async def run_command(
    *args: str,
    cwd: str | None = None,
) -> tuple[int, str, str]:
    """Run a command and return exit code, stdout, stderr."""
    if IS_WINDOWS:
        cmd = " ".join(f'"{a}"' if " " in a else a for a in args)
        proc = await asyncio.create_subprocess_shell(
            cmd,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
    else:
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=cwd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

    stdout, stderr = await proc.communicate()
    return (
        proc.returncode or 0,
        stdout.decode("utf-8", errors="replace"),
        stderr.decode("utf-8", errors="replace"),
    )


@dataclass
class GitStatus:
    """Git repository status."""

    branch: str
    staged: list[str]
    unstaged: list[str]
    untracked: list[str]
    ahead: int
    behind: int

    @property
    def is_clean(self) -> bool:
        """Check if working directory is clean."""
        return not (self.staged or self.unstaged or self.untracked)

    @property
    def has_changes(self) -> bool:
        """Check if there are any uncommitted changes."""
        return bool(self.staged or self.unstaged or self.untracked)


@dataclass
class PullRequest:
    """GitHub Pull Request information."""

    number: int
    title: str
    state: str
    url: str
    head_branch: str
    base_branch: str
    author: str
    created_at: datetime
    updated_at: datetime
    draft: bool


class GitHubService:
    """Service for Git and GitHub CLI operations."""

    def __init__(self) -> None:
        """Initialize GitHub service."""
        self.repo_root = str(REPO_ROOT)

    async def get_status(self) -> GitStatus | None:
        """Get current git status.

        Returns:
            GitStatus object or None if not a git repo.
        """
        try:
            # Get current branch
            returncode, branch_stdout, _ = await run_command(
                "git", "branch", "--show-current",
                cwd=self.repo_root,
            )
            branch = branch_stdout.strip()

            # Get status in porcelain format
            returncode, status_stdout, _ = await run_command(
                "git", "status", "--porcelain",
                cwd=self.repo_root,
            )

            staged = []
            unstaged = []
            untracked = []

            for line in status_stdout.strip().split("\n"):
                if not line:
                    continue
                index_status = line[0]
                worktree_status = line[1]
                filename = line[3:]

                if index_status == "?":
                    untracked.append(filename)
                elif index_status != " ":
                    staged.append(filename)

                if worktree_status not in (" ", "?"):
                    unstaged.append(filename)

            # Get ahead/behind count
            returncode, ab_stdout, _ = await run_command(
                "git", "rev-list", "--left-right", "--count", f"HEAD...origin/{branch}",
                cwd=self.repo_root,
            )
            ahead, behind = 0, 0
            if ab_stdout.strip():
                parts = ab_stdout.strip().split()
                if len(parts) == 2:
                    ahead, behind = int(parts[0]), int(parts[1])

            return GitStatus(
                branch=branch,
                staged=staged,
                unstaged=unstaged,
                untracked=untracked,
                ahead=ahead,
                behind=behind,
            )
        except Exception:
            return None

    async def add_files(self, files: list[str] | None = None) -> tuple[bool, str]:
        """Stage files for commit.

        Args:
            files: List of files to add. If None, adds all changes.

        Returns:
            Tuple of (success, output).
        """
        if files:
            args = ("git", "add", *files)
        else:
            args = ("git", "add", "-A")

        returncode, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def commit(self, message: str) -> tuple[bool, str]:
        """Create a commit with the given message.

        Args:
            message: Commit message.

        Returns:
            Tuple of (success, output).
        """
        returncode, stdout, stderr = await run_command(
            "git", "commit", "-m", message,
            cwd=self.repo_root,
        )
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def push(self, set_upstream: bool = False) -> tuple[bool, str]:
        """Push commits to remote.

        Args:
            set_upstream: If True, sets upstream tracking.

        Returns:
            Tuple of (success, output).
        """
        if set_upstream:
            args = ("git", "push", "-u", "origin", "HEAD")
        else:
            args = ("git", "push")

        returncode, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def pull(self) -> tuple[bool, str]:
        """Pull changes from remote.

        Returns:
            Tuple of (success, output).
        """
        returncode, stdout, stderr = await run_command(
            "git", "pull",
            cwd=self.repo_root,
        )
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def get_log(self, count: int = 10) -> list[dict]:
        """Get recent commit log.

        Args:
            count: Number of commits to return.

        Returns:
            List of commit dictionaries.
        """
        returncode, stdout, _ = await run_command(
            "git", "log", f"-{count}", "--format=%H|%s|%an|%ar",
            cwd=self.repo_root,
        )

        commits = []
        for line in stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("|")
            if len(parts) >= 4:
                commits.append({
                    "hash": parts[0][:7],
                    "message": parts[1],
                    "author": parts[2],
                    "time": parts[3],
                })
        return commits

    async def list_prs(self, state: str = "open") -> list[PullRequest]:
        """List pull requests using gh CLI.

        Args:
            state: PR state filter (open, closed, merged, all).

        Returns:
            List of PullRequest objects.
        """
        try:
            returncode, stdout, _ = await run_command(
                "gh", "pr", "list", "--state", state, "--json",
                "number,title,state,url,headRefName,baseRefName,author,createdAt,updatedAt,isDraft",
                cwd=self.repo_root,
            )

            if returncode != 0:
                return []

            data = json.loads(stdout)
            prs = []

            for pr in data:
                prs.append(PullRequest(
                    number=pr["number"],
                    title=pr["title"],
                    state=pr["state"],
                    url=pr["url"],
                    head_branch=pr["headRefName"],
                    base_branch=pr["baseRefName"],
                    author=pr["author"]["login"],
                    created_at=datetime.fromisoformat(
                        pr["createdAt"].replace("Z", "+00:00")
                    ),
                    updated_at=datetime.fromisoformat(
                        pr["updatedAt"].replace("Z", "+00:00")
                    ),
                    draft=pr["isDraft"],
                ))

            return prs
        except Exception:
            return []

    async def create_pr(
        self,
        title: str,
        body: str,
        base: str = "main",
        draft: bool = False,
    ) -> tuple[bool, str]:
        """Create a new pull request.

        Args:
            title: PR title.
            body: PR body/description.
            base: Base branch to merge into.
            draft: If True, creates a draft PR.

        Returns:
            Tuple of (success, output/URL).
        """
        args = ["gh", "pr", "create", "--title", title, "--body", body, "--base", base]
        if draft:
            args.append("--draft")

        returncode, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        success = returncode == 0
        output = stdout.strip() if success else stderr
        return success, output

    async def view_pr(self, number: int | None = None) -> tuple[bool, str]:
        """View a pull request in browser.

        Args:
            number: PR number to view. If None, views current branch's PR.

        Returns:
            Tuple of (success, output).
        """
        if number:
            args = ("gh", "pr", "view", str(number), "--web")
        else:
            args = ("gh", "pr", "view", "--web")

        returncode, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output

    async def diff(self, staged: bool = False) -> tuple[bool, str]:
        """Show git diff.

        Args:
            staged: If True, show staged changes only.

        Returns:
            Tuple of (success, output).
        """
        if staged:
            args = ("git", "diff", "--staged")
        else:
            args = ("git", "diff")

        returncode, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        success = returncode == 0
        output = stdout if success else stderr
        return success, output
