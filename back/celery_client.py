import os
from datetime import timedelta
from celery import Celery
from celery.app.registry import TaskRegistry

from back.sd_task import SDTask
from back.cn_task import CNTask

# Celery
model_type = os.getenv("MODEL_TYPE", "sd")
load_model = os.getenv("LOAD_MODEL", False)
load_model = True if load_model.lower() == "true" else False
registry = TaskRegistry()
if model_type == "sd" or not load_model:
    registry.register(
        SDTask(
            base_model_path=os.getenv("BASE_MODEL_PATH", "stabilityai/sdxl-turbo"),
            google_key=os.getenv("GOOGLE_KEY", "None"),
            inpainting_model_path=os.getenv(
                "INPAINTING_MODEL_PATH", "stabilityai/stable-diffusion-2-inpainting"
            ),
            load_model=load_model,
        )
    )
if model_type == "cn" or not load_model:
    registry.register(
        CNTask(
            base_model_path=os.getenv("BASE_MODEL_PATH", "stabilityai/stable-diffusion-xl-base-1.0"),
            controlnet_model_path=os.getenv("CONTROLNET_MODEL_PATH", "diffusers/controlnet-canny-sdxl-1.0"),
            vae_model_path=os.getenv("VAE_MODEL_PATH", "madebyollin/sdxl-vae-fp16-fix"),
            google_key=os.getenv("GOOGLE_KEY", "None"),
            inpainting_model_path=os.getenv(
                "INPAINTING_MODEL_PATH", "stabilityai/stable-diffusion-2-inpainting"
            ),
            load_model=load_model,
        )
    )

REDIS_HOST = os.getenv("REDIS_SERVICE_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_SERVICE_PORT", "6379")
REDIS_DB = os.getenv("REDIS_DB", "0")
CELERY_RESULT_BACKEND = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
RABBITMQ_DEFAULT_USER = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
RABBITMQ_DEFAULT_PASS = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
RABBITMQ_SERVICE_HOST = os.getenv("RABBITMQ_SERVICE_HOST", "localhost")
RABBITMQ_SERVICE_PORT = os.getenv("RABBITMQ_SERVICE_PORT", "5672")
CELERY_BROKER_URL = f"amqp://{RABBITMQ_DEFAULT_USER}:{RABBITMQ_DEFAULT_PASS}@{RABBITMQ_SERVICE_HOST}:{RABBITMQ_SERVICE_PORT}"
APP_RESULTS_CLEANUP_MINUTES = float(os.getenv("APP_RESULTS_CLEANUP_MINUTES", "2"))
CELERY_BEAT_SCHEDULE = {
    "cleanup": {
        "task": "celery.backend_cleanup",
        "schedule": timedelta(minutes=APP_RESULTS_CLEANUP_MINUTES),
    },
}
client = Celery(
    __name__,
    tasks=registry,
    result_backend=CELERY_RESULT_BACKEND,
    broker_url=CELERY_BROKER_URL,
)
client.conf.update(
    task_serializer="pickle",
    result_serializer="pickle",
    accept_content=["application/json", "application/x-python-serialize"],
    result_expires=timedelta(days=1),
    beat_schedule=CELERY_BEAT_SCHEDULE,
    task_routes={
        'sd': {'queue': 'sd'},
        'cn': {'queue': 'cn'},
    },
)
