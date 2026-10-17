import json
from pathlib import Path
from typing import Dict, List, Optional
from ppgscope.models.taxonomy import TopicDefinition


class TaxonomyManager:
    """
    Loads, validates and manages versioned topic taxonomies.
    Guarantees the presence of the mandatory INNE/NIEOKREŚLONE fallback.
    """

    MANDATORY_FALLBACK = "INNE/NIEOKREŚLONE"

    def __init__(self, taxonomy_file_path: Optional[str] = None):
        if taxonomy_file_path is None:
            # Default to config/taxonomy_v1.json
            repo_root = Path(__file__).resolve().parent.parent.parent
            taxonomy_file_path = str(repo_root / "config" / "taxonomy_v1.json")

        self.path = Path(taxonomy_file_path)
        self.version = "1.0.0"
        self.topics: Dict[str, TopicDefinition] = {}
        self.confidence_threshold: float = 0.40
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            raise FileNotFoundError(f"Taxonomy configuration file not found at: {self.path}")

        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.version = data.get("version", "1.0.0")
        self.confidence_threshold = float(data.get("confidence_threshold", 0.40))
        
        raw_topics = data.get("topics", [])
        for t in raw_topics:
            topic = TopicDefinition(
                id=t["id"],
                name=t["name"],
                description=t["description"],
                keywords=t.get("keywords", []),
            )
            self.topics[topic.id] = topic

        # Verify mandatory fallback
        if self.MANDATORY_FALLBACK not in self.topics:
            raise ValueError(f"Taxonomy schema violates rule: missing mandatory fallback {self.MANDATORY_FALLBACK}")

    def get_topic(self, topic_id: str) -> Optional[TopicDefinition]:
        return self.topics.get(topic_id)

    def list_topic_ids(self) -> List[str]:
        return list(self.topics.keys())
