"""Entry point for armhr-cli."""

import sys

from armhr_cli.app import run


def main():
    """Main entry point."""
    try:
        run()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
