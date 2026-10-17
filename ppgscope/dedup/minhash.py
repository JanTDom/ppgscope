import re
from typing import List, Set
from datasketch import MinHash


class TextMinHasher:
    """
    Constructs normalized shingles and MinHash signatures for Polish journalistic texts.
    """

    def __init__(self, num_perm: int = 128, shingle_size: int = 3):
        self.num_perm = num_perm
        self.shingle_size = shingle_size

    def normalize_and_tokenize(self, text: str) -> List[str]:
        """Cleanses text, removes punctuation and splits into normalized words."""
        clean = re.sub(r"[^\w\s]", " ", text.lower(), flags=re.UNICODE)
        words = [w for w in clean.split() if len(w) > 1]
        return words

    def get_shingles(self, text: str) -> Set[str]:
        """Creates word-level n-gram shingles."""
        words = self.normalize_and_tokenize(text)
        if len(words) < self.shingle_size:
            return {" ".join(words)} if words else set()
        
        shingles = set()
        for i in range(len(words) - self.shingle_size + 1):
            shingle = " ".join(words[i : i + self.shingle_size])
            shingles.add(shingle)
        return shingles

    def create_minhash(self, text: str) -> MinHash:
        """Generates a datasketch MinHash signature from text shingles."""
        m = MinHash(num_perm=self.num_perm)
        shingles = self.get_shingles(text)
        for s in shingles:
            m.update(s.encode("utf-8"))
        return m

    def calculate_jaccard(self, text_a: str, text_b: str) -> float:
        """Estimates Jaccard similarity between two texts using MinHash."""
        m1 = self.create_minhash(text_a)
        m2 = self.create_minhash(text_b)
        return float(m1.jaccard(m2))
