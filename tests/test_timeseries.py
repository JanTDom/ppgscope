import json
from pathlib import Path
import pytest
from scripts.sync_dashboard_real_data import generate_realistic_daily_timeseries


def test_generate_realistic_daily_timeseries_structure():
    ts = generate_realistic_daily_timeseries(days=30)
    assert len(ts) == 30
    for day in ts:
        assert "date" in day
        assert "label" in day
        assert "total" in day
        assert day["total"] > 0
        topics = [day["polityka"], day["gospodarka"], day["spoleczenstwo"], day["sport"], day["lokalne"], day["prawo"]]
        assert all(t >= 0 for t in topics)
        # Sum of categories must match total exactly
        assert sum(topics) == day["total"], f"Failed on day {day['date']}: {sum(topics)} != {day['total']}"


def test_daily_timeseries_dynamic_variance():
    ts = generate_realistic_daily_timeseries(days=14)
    # Proportions should not be identical day-to-day
    sport_shares = [day["sport"] / day["total"] for day in ts]
    pol_shares = [day["polityka"] / day["total"] for day in ts]

    # Verify that not all sport shares are equal
    assert len(set(sport_shares)) > 1
    assert len(set(pol_shares)) > 1

    # Check that weekend sport share is significantly elevated vs mid-week
    # In any 14-day window there are 4 weekend days
    weekend_days = [day for day in ts if day["total"] < 9000]
    weekday_days = [day for day in ts if day["total"] >= 9000]

    avg_weekend_sport = sum(d["sport"] / d["total"] for d in weekend_days) / len(weekend_days)
    avg_weekday_sport = sum(d["sport"] / d["total"] for d in weekday_days) / len(weekday_days)

    assert avg_weekend_sport > avg_weekday_sport, f"Weekend sport ({avg_weekend_sport:.3f}) should exceed weekday ({avg_weekday_sport:.3f})"


def test_dashboard_json_timeseries_validity():
    repo_root = Path(__file__).resolve().parent.parent
    data_file = repo_root / "data" / "dashboard.json"
    assert data_file.exists()

    with open(data_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "daily_timeseries" in data
    ts = data["daily_timeseries"]
    assert len(ts) >= 365

    # Check last 30 days data integrity
    for day in ts[-30:]:
        day_sum = day["lokalne"] + day["sport"] + day["prawo"] + day["gospodarka"] + day["spoleczenstwo"] + day["polityka"]
        assert day_sum == day["total"]
