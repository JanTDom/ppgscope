import xml.etree.ElementTree as ET
from typing import List, Optional
from pydantic import BaseModel


class RssItem(BaseModel):
    title: str
    link: str
    description: Optional[str] = None
    pub_date: Optional[str] = None
    guid: Optional[str] = None
    category: Optional[str] = None


class RssChannel(BaseModel):
    title: str
    link: str
    description: Optional[str] = None
    items: List[RssItem] = []


class RssParser:
    """
    Parses RSS 2.0 XML feeds provided by PPG media sites.
    """

    @classmethod
    def parse(cls, xml_content: str) -> RssChannel:
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            raise ValueError(f"Failed to parse RSS XML: {e}")

        channel_elem = root.find("channel")
        if channel_elem is None:
            raise ValueError("RSS feed missing <channel> element")

        c_title = channel_elem.findtext("title", default="").strip()
        c_link = channel_elem.findtext("link", default="").strip()
        c_desc = channel_elem.findtext("description", default="").strip()

        items: List[RssItem] = []
        for item_elem in channel_elem.findall("item"):
            title = item_elem.findtext("title", default="").strip()
            link = item_elem.findtext("link", default="").strip()
            desc = item_elem.findtext("description")
            pub_date = item_elem.findtext("pubDate")
            guid = item_elem.findtext("guid")
            category = item_elem.findtext("category")

            if title and link:
                items.append(
                    RssItem(
                        title=title,
                        link=link,
                        description=desc.strip() if desc else None,
                        pub_date=pub_date.strip() if pub_date else None,
                        guid=guid.strip() if guid else None,
                        category=category.strip() if category else None,
                    )
                )

        return RssChannel(title=c_title, link=c_link, description=c_desc, items=items)
