import json
from pathlib import Path
from typing import Dict, List, Optional
import yaml
from ppgscope.models.taxonomy import TopicDefinition, DomainDefinition


class TaxonomyManager:
    """
    Loads, validates and manages versioned topic taxonomies (v1 and v2).
    Also provides coverage area lookup for titles from config/title_coverage_areas.yaml.
    """

    MANDATORY_FALLBACK = "INNE/NIEOKREŚLONE"

    def __init__(self, taxonomy_file_path: Optional[str] = None):
        repo_root = Path(__file__).resolve().parent.parent.parent
        if taxonomy_file_path is None:
            # Default to v2 if available, else v1
            v2_path = repo_root / "config" / "taxonomy_v2.json"
            v1_path = repo_root / "config" / "taxonomy_v1.json"
            self.path = v2_path if v2_path.exists() else v1_path
        else:
            self.path = Path(taxonomy_file_path)

        self.coverage_path = repo_root / "config" / "title_coverage_areas.yaml"
        self.coverage_areas: Dict[str, dict] = {}
        self.version = "2.0.0"
        self.topics: Dict[str, TopicDefinition] = {}
        self.domains: Dict[str, DomainDefinition] = {}
        self.confidence_threshold: float = 0.40
        self._load()
        self._load_coverage()

    def _load(self) -> None:
        if not self.path.exists():
            raise FileNotFoundError(f"Taxonomy configuration file not found at: {self.path}")

        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.version = data.get("version", "2.0.0")
        self.confidence_threshold = float(data.get("confidence_threshold", 0.40))
        
        # Load v1 topics if present
        raw_topics = data.get("topics", [])
        for t in raw_topics:
            topic = TopicDefinition(
                id=t["id"],
                name=t["name"],
                description=t["description"],
                keywords=t.get("keywords", []),
            )
            self.topics[topic.id] = topic

        # Load v2 domains if present
        raw_domains = data.get("domains", [])
        for d in raw_domains:
            domain = DomainDefinition(
                slug=d["slug"],
                code=d["code"],
                name=d["name"],
                description=d["description"],
                allowed_localities=d.get("allowed_localities", ["C", "CL", "L"]),
            )
            self.domains[domain.slug] = domain

        # If v2 is active and no v1 topics, populate compatibility topics
        if not self.topics and self.domains:
            self.topics[self.MANDATORY_FALLBACK] = TopicDefinition(
                id=self.MANDATORY_FALLBACK,
                name="Inne / Nieokreślone",
                description="Kategoria zapasowa",
                keywords=[],
            )
            for slug, d in self.domains.items():
                self.topics[slug.upper()] = TopicDefinition(
                    id=slug.upper(),
                    name=d.name,
                    description=d.description,
                    keywords=[],
                )
        elif self.MANDATORY_FALLBACK not in self.topics:
            self.topics[self.MANDATORY_FALLBACK] = TopicDefinition(
                id=self.MANDATORY_FALLBACK,
                name="Inne / Nieokreślone",
                description="Kategoria zapasowa",
                keywords=[],
            )

    def _load_coverage(self) -> None:
        if self.coverage_path.exists():
            try:
                with open(self.coverage_path, "r", encoding="utf-8") as f:
                    self.coverage_areas = yaml.safe_load(f) or {}
            except Exception:
                self.coverage_areas = {}

    def get_topic(self, topic_id: str) -> Optional[TopicDefinition]:
        return self.topics.get(topic_id)

    def get_domain(self, slug: str) -> Optional[DomainDefinition]:
        return self.domains.get(slug)

    def list_topic_ids(self) -> List[str]:
        return list(self.topics.keys())

    def list_domain_slugs(self) -> List[str]:
        return list(self.domains.keys())

    def get_coverage_for_domain(self, title_domain: str) -> Optional[dict]:
        clean_key = title_domain.replace(".", "_").replace("-", "_")
        if clean_key in self.coverage_areas:
            return self.coverage_areas[clean_key]
        for key, val in self.coverage_areas.items():
            if key in clean_key or clean_key in key:
                return val
        return None
