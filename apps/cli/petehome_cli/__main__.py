"""Entry point for petehome-cli."""

import sys

from petehome_cli.app import run


def main():
    """Main entry point."""
    try:
        run()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
