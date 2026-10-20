import time
import asyncio
from typing import Optional, Dict
from urllib.parse import urlparse
import httpx


class PoliteHttpClient:
    """
    Polite HTTP client configured specifically for PPGscope:
    - Transparent User-Agent with verifiable identity and contact email.
    - Strict per-domain rate limiting (default <= 1 request/sec per domain).
    - Exponential backoff retry on transient errors (429, 502, 503, 504).
    """

    DEFAULT_USER_AGENT = "PPGscope/1.0 (+https://ppgscope.pl; kontakt@ppgscope.pl)"

    def __init__(
        self,
        user_agent: str = DEFAULT_USER_AGENT,
        rate_limit_per_domain_sec: float = 1.0,
        timeout: float = 10.0,
        max_retries: int = 3,
        backoff_factor: float = 1.5,
    ):
        self.user_agent = user_agent
        self.rate_limit_sec = rate_limit_per_domain_sec
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self._last_request_time: Dict[str, float] = {}

    def _throttle(self, domain: str) -> None:
        """Enforces rate limiting per apex domain synchronously."""
        now = time.time()
        last = self._last_request_time.get(domain, 0.0)
        elapsed = now - last
        if elapsed < self.rate_limit_sec:
            time.sleep(self.rate_limit_sec - elapsed)
        self._last_request_time[domain] = time.time()

    def get(self, url: str, headers: Optional[Dict[str, str]] = None) -> httpx.Response:
        """Executes a polite synchronous HTTP GET request with retries and rate limiting."""
        domain = urlparse(url).netloc
        self._throttle(domain)

        req_headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        if headers:
            req_headers.update(headers)

        last_error = None
        delay = 1.0

        for attempt in range(self.max_retries + 1):
            try:
                with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                    resp = client.get(url, headers=req_headers)
                    # Retry on rate limit or server error
                    if resp.status_code in (429, 502, 503, 504) and attempt < self.max_retries:
                        time.sleep(delay)
                        delay *= self.backoff_factor
                        continue
                    return resp
            except (httpx.RequestError, httpx.TimeoutException) as e:
                last_error = e
                if attempt < self.max_retries:
                    time.sleep(delay)
                    delay *= self.backoff_factor
                else:
                    raise last_error

        raise RuntimeError(f"Request to {url} failed after {self.max_retries} retries: {last_error}")
