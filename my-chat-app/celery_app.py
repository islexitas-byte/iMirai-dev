from celery import Celery

celery_app = Celery(
    "pilog_worker",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0"
    # broker="redis://localhost:6379/0",
    # backend="redis://localhost:6379/0"
)

celery_app.conf.update(
    task_track_started=True,
    timezone="UTC",
    enable_utc=True,
)

# 🔥 IMPORTANT: import tasks so Celery registers them
import tasks
