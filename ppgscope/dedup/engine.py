import uuid
from typing import Dict, List, Optional, Tuple
from datasketch import MinHashLSH, MinHash

from ppgscope.models.article import Article
from ppgscope.models.dedup import DuplicateCluster
from ppgscope.dedup.minhash import TextMinHasher


class DeduplicationEngine:
    """
    Syndicate detection and near-duplicate clusterer using MinHash and LSH indexing.
    Identifies shared cross-published articles across PPG titles (TEKST WSPÓLNY).
    """

    def __init__(self, threshold: float = 0.80, num_perm: int = 128):
        self.threshold = threshold
        self.num_perm = num_perm
        self.hasher = TextMinHasher(num_perm=num_perm)
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
        
        # In-memory storage for articles and clusters
        self._articles_by_url: Dict[str, Article] = {}
        self._minhashes_by_url: Dict[str, MinHash] = {}
        self._clusters_by_id: Dict[str, DuplicateCluster] = {}
        self._cluster_by_url: Dict[str, str] = {}

    def process_article(self, article: Article) -> Article:
        """
        Processes an article, registers its signature in LSH index,
        and links it to existing duplicate cluster or initiates a new cluster.
        """
        # Calculate MinHash
        minhash = self.hasher.create_minhash(article.body)
        url = article.canonical_url
        
        # Check for matching items in LSH
        matches = self.lsh.query(minhash)

        if not matches:
            # Unique new article or first seen in a potential future cluster
            cluster_id = f"cluster_{uuid.uuid4().hex[:12]}"
            cluster = DuplicateCluster(
                cluster_id=cluster_id,
                original_url=url,
                original_published_at=article.published_at,
                original_title=article.title,
                original_press_title=article.press_title,
                duplicate_count=0,
                member_urls=[url],
            )
            self._clusters_by_id[cluster_id] = cluster
            self._cluster_by_url[url] = cluster_id
            
            # Register in LSH
            self.lsh.insert(url, minhash)
            self._articles_by_url[url] = article
            self._minhashes_by_url[url] = minhash

            article.is_duplicate = False
            article.duplicate_cluster_id = cluster_id
            article.original_article_url = url
            return article

        # Matches exist -> find the cluster of the earliest match
        matched_url = matches[0]
        cluster_id = self._cluster_by_url[matched_url]
        cluster = self._clusters_by_id[cluster_id]

        # Determine if current article was published earlier than existing original
        if article.published_at < cluster.original_published_at:
            # Candidate is actually the earlier original!
            previous_original_url = cluster.original_url
            if previous_original_url in self._articles_by_url:
                prev_article = self._articles_by_url[previous_original_url]
                prev_article.is_duplicate = True
                prev_article.original_article_url = url

            cluster.original_url = url
            cluster.original_published_at = article.published_at
            cluster.original_title = article.title
            cluster.original_press_title = article.press_title
            
            article.is_duplicate = False
            article.original_article_url = url
        else:
            # Candidate is a duplicate of the existing original
            article.is_duplicate = True
            article.original_article_url = cluster.original_url

        cluster.duplicate_count += 1
        if url not in cluster.member_urls:
            cluster.member_urls.append(url)

        article.duplicate_cluster_id = cluster_id
        self._cluster_by_url[url] = cluster_id
        self.lsh.insert(url, minhash)
        self._articles_by_url[url] = article
        self._minhashes_by_url[url] = minhash

        return article

    def get_cluster(self, cluster_id: str) -> Optional[DuplicateCluster]:
        return self._clusters_by_id.get(cluster_id)

    def get_cluster_by_url(self, url: str) -> Optional[DuplicateCluster]:
        cluster_id = self._cluster_by_url.get(url)
        return self._clusters_by_id.get(cluster_id) if cluster_id else None

    def get_all_clusters(self) -> List[DuplicateCluster]:
        return list(self._clusters_by_id.values())
