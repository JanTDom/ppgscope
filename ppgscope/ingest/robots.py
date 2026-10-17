import re
from typing import List, Optional, Tuple
from urllib.parse import urlparse


class RobotsChecker:
    """
    Parses robots.txt files and verifies whether PPGscope is allowed to fetch given paths.
    Conforms to RFC 9309: when both Allow and Disallow match, the most specific (longest) pattern wins.
    """

    def __init__(self, robots_txt_content: str):
        self.raw_content = robots_txt_content
        self.sitemaps: List[str] = []
        self.disallow_patterns: List[str] = []
        self.allow_patterns: List[str] = []
        self._parse()

    def _parse(self) -> None:
        lines = self.raw_content.splitlines()
        current_agent_matches = False
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            sitemap_match = re.match(r"^sitemap:\s*(https?://\S+)", line, re.IGNORECASE)
            if sitemap_match:
                self.sitemaps.append(sitemap_match.group(1).strip())
                continue

            ua_match = re.match(r"^user-agent:\s*(.+)$", line, re.IGNORECASE)
            if ua_match:
                agent = ua_match.group(1).strip().lower()
                current_agent_matches = agent in ("*", "ppgscope")
                continue

            if current_agent_matches:
                disallow_match = re.match(r"^disallow:\s*(\S*)", line, re.IGNORECASE)
                if disallow_match:
                    pattern = disallow_match.group(1).strip()
                    if pattern:
                        self.disallow_patterns.append(pattern)
                
                allow_match = re.match(r"^allow:\s*(\S*)", line, re.IGNORECASE)
                if allow_match:
                    pattern = allow_match.group(1).strip()
                    if pattern:
                        self.allow_patterns.append(pattern)

    def is_allowed(self, path_or_url: str) -> bool:
        """
        Determines if a path is allowed.
        Under RFC 9309, if multiple directives match, the directive with the longest pattern applies.
        If equal length, Allow wins.
        """
        path = urlparse(path_or_url).path or "/"
        
        longest_allow_len = -1
        for pattern in self.allow_patterns:
            regex_pat = "^" + re.escape(pattern).replace(r"\*", ".*")
            if re.match(regex_pat, path):
                longest_allow_len = max(longest_allow_len, len(pattern))

        longest_disallow_len = -1
        for pattern in self.disallow_patterns:
            regex_pat = "^" + re.escape(pattern).replace(r"\*", ".*")
            if re.match(regex_pat, path):
                longest_disallow_len = max(longest_disallow_len, len(pattern))

        if longest_disallow_len > longest_allow_len:
            return False
        return True
