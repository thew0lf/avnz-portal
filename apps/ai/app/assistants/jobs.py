import os
import json
import time
import uuid
from typing import Optional, Dict, Any, List

import redis


def rds() -> redis.Redis:
    url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    return redis.from_url(url)


JOBS_LIST = "agents:jobs"
RECENT_JOBS_LIST = "agents:jobs:recent"
JOB_KEY = "agents:job:{id}"
JOB_TTL = int(os.getenv("AGENTS_JOB_TTL", "86400"))  # default 24h


def new_job(task: str, meta: Optional[Dict[str, Any]] = None) -> str:
    job_id = str(uuid.uuid4())
    info = {
        "id": job_id,
        "task": task,
        "status": "queued",
        "created_at": int(time.time()),
        }
    rd = rds()
    if meta and isinstance(meta, dict):
        info["meta"] = meta
    rd.setex(JOB_KEY.format(id=job_id), JOB_TTL, json.dumps(info))
    rd.lpush(JOBS_LIST, job_id)
    rd.ltrim(JOBS_LIST, 0, 9999)
    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    rd = rds()
    raw = rd.get(JOB_KEY.format(id=job_id))
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def set_job(job_id: str, **fields: Any) -> None:
    rd = rds()
    key = JOB_KEY.format(id=job_id)
    raw = rd.get(key)
    data = {}
    if raw:
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
    data.update(fields)
    rd.setex(key, JOB_TTL, json.dumps(data))


def add_recent(job_id: str) -> None:
    rd = rds()
    rd.lpush(RECENT_JOBS_LIST, job_id)
    rd.ltrim(RECENT_JOBS_LIST, 0, 999)


def list_jobs(limit: int = 50) -> List[Dict[str, Any]]:
    rd = rds()
    ids = [i.decode("utf-8") for i in rd.lrange(JOBS_LIST, 0, max(0, limit - 1))]
    seen = set()
    out: List[Dict[str, Any]] = []
    for jid in ids:
        if jid in seen:
            continue
        seen.add(jid)
        j = get_job(jid)
        if j:
            out.append(j)
    return out


def list_recent_jobs(limit: int = 50) -> List[Dict[str, Any]]:
    rd = rds()
    ids = [i.decode("utf-8") for i in rd.lrange(RECENT_JOBS_LIST, 0, max(0, limit - 1))]
    seen = set()
    out: List[Dict[str, Any]] = []
    for jid in ids:
        if jid in seen:
            continue
        seen.add(jid)
        j = get_job(jid)
        if j:
            out.append(j)
    # sort by finished_at desc if present
    out.sort(key=lambda x: int(x.get("finished_at") or 0), reverse=True)
    return out


def cancel_job(job_id: str) -> Dict[str, Any]:
    rd = rds()
    key = JOB_KEY.format(id=job_id)
    raw = rd.get(key)
    if not raw:
        return {"ok": False, "reason": "not_found"}
    try:
        job = json.loads(raw)
    except Exception:
        job = {"id": job_id}
    status = job.get("status")
    if status == "queued":
        # remove from pending list and mark canceled
        rd.lrem(JOBS_LIST, 0, job_id)
        set_job(job_id, status="canceled", finished_at=int(time.time()))
        add_recent(job_id)
        return {"ok": True, "status": "canceled"}
    elif status == "running":
        # cannot preempt running safely; mark cancel_requested
        set_job(job_id, cancel_requested=True)
        return {"ok": True, "status": "running", "note": "cancel_requested"}
    else:
        # done/error/canceled
        return {"ok": True, "status": status}
