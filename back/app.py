import os
from flask import Flask
from flask import request, jsonify
from flask_cors import CORS

from back.celery_client import client

# Flask
rest_app = Flask(__name__)
cors = CORS(rest_app)


# Routes
@rest_app.route("/")
def default():
    return "Invalid route."


@rest_app.route("/health")
def health():
    state = {"status": "UP"}
    return jsonify(state)


@rest_app.route("/process-image", methods=["POST"])
def process_image():
    data = request.json
    prompt = data.get("prompt")
    strength = float(data.get("strength", 0.5))
    steps = int(data.get("steps", 3))
    location = data.get("location", "40, -5")
    guidance_scale = float(data.get("guidance_scale", 3.0))
    model_type = data.get("model_type", "sd")
    if model_type == "sd":
        async_result = client.tasks["sd"].delay(
            prompt=prompt,
            strength=strength,
            steps=steps,
            location=location,
            guidance_scale=guidance_scale,
        )
    elif model_type == "cn":
        async_result = client.tasks["cn"].delay(
            prompt=prompt,
            strength=strength,
            steps=steps,
            location=location,
            guidance_scale=guidance_scale,
        )
    else:
        return jsonify({"error": "Invalid model type."}), 400
    return jsonify({"report_id": async_result.id}), 202


@rest_app.route("/result-process-image/<report_id>")
def process_image_result(report_id):
    task_result = client.AsyncResult(report_id)
    result = {
        "task_id": report_id,
        "task_status": task_result.status,
        "task_result": task_result.result,
    }
    if task_result.status == "FAILURE":
        return (
            jsonify(
                {
                    "task_id": report_id,
                    "task_status": task_result.status,
                    "task_result": str(task_result.result),
                }
            ),
            500,
        )
    if task_result.status == "REVOKED":
        return (
            jsonify(
                {
                    "task_id": report_id,
                    "task_status": task_result.status,
                    "task_result": str(task_result.result),
                }
            ),
            500,
        )
    return jsonify(result), 200


if __name__ == "__main__":
    rest_app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
