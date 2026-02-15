"""GitHub CLI integration service."""

import json
from dataclasses import dataclass
from datetime import datetime

from petehome_cli.config import REPO_ROOT
from petehome_cli.services.process import run_command


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
        return not (self.staged or self.unstaged or self.untracked)

    @property
    def has_changes(self) -> bool:
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
        self.repo_root = str(REPO_ROOT)

    async def get_status(self) -> GitStatus | None:
        """Get current git status."""
        try:
            _, branch_stdout, _ = await run_command(
                "git", "branch", "--show-current",
                cwd=self.repo_root,
            )
            branch = branch_stdout.strip()

            _, status_stdout, _ = await run_command(
                "git", "status", "--porcelain",
                cwd=self.repo_root,
            )

            staged: list[str] = []
            unstaged: list[str] = []
            untracked: list[str] = []

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

            _, ab_stdout, _ = await run_command(
                "git", "rev-list", "--left-right", "--count",
                f"HEAD...origin/{branch}",
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
        """Stage files for commit."""
        if files:
            args = ("git", "add", *files)
        else:
            args = ("git", "add", "-A")

        code, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        return code == 0, stdout if code == 0 else stderr

    async def commit(self, message: str) -> tuple[bool, str]:
        """Create a commit."""
        code, stdout, stderr = await run_command(
            "git", "commit", "-m", message,
            cwd=self.repo_root,
        )
        return code == 0, stdout if code == 0 else stderr

    async def push(self, set_upstream: bool = False) -> tuple[bool, str]:
        """Push commits to remote."""
        if set_upstream:
            args = ("git", "push", "-u", "origin", "HEAD")
        else:
            args = ("git", "push",)

        code, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        return code == 0, stdout if code == 0 else stderr

    async def pull(self) -> tuple[bool, str]:
        """Pull changes from remote."""
        code, stdout, stderr = await run_command("git", "pull", cwd=self.repo_root)
        return code == 0, stdout if code == 0 else stderr

    async def get_log(self, count: int = 10) -> list[dict]:
        """Get recent commit log."""
        _, stdout, _ = await run_command(
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
        """List pull requests using gh CLI."""
        try:
            code, stdout, _ = await run_command(
                "gh", "pr", "list", "--state", state, "--json",
                "number,title,state,url,headRefName,baseRefName,author,createdAt,updatedAt,isDraft",
                cwd=self.repo_root,
            )
            if code != 0:
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
                        pr["createdAt"].replace("Z", "+00:00"),
                    ),
                    updated_at=datetime.fromisoformat(
                        pr["updatedAt"].replace("Z", "+00:00"),
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
        """Create a new pull request."""
        args = [
            "gh", "pr", "create",
            "--title", title,
            "--body", body,
            "--base", base,
        ]
        if draft:
            args.append("--draft")

        code, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        return code == 0, stdout.strip() if code == 0 else stderr

    async def diff(self, staged: bool = False) -> tuple[bool, str]:
        """Show git diff."""
        args = ("git", "diff", "--staged") if staged else ("git", "diff")
        code, stdout, stderr = await run_command(*args, cwd=self.repo_root)
        return code == 0, stdout if code == 0 else stderr
