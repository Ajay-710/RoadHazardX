from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import clip
from PIL import Image
import joblib
import os

app = Flask(__name__)
# Enable CORS for frontend requests (Adjust origins for production if needed)
CORS(app)

# 1. Load CLIP Model
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading CLIP model on {device}...")
model, preprocess = clip.load("ViT-B/32", device=device)

# 2. Load V2 Model and Label Map
print("Loading RoadHazeX V2 model...")
try:
    clf = joblib.load("roadhazex_model_v2.joblib")
    label_map = joblib.load("label_map_v2.joblib")
    print("V2 model and label map loaded successfully!")
except Exception as e:
    print(f"Error loading V2 model: {e}")
    clf = None
    label_map = None

def predict_with_confidence(image_stream):
    """
    Step 7: Predict hazard and calculate confidence score.
    """
    image = preprocess(Image.open(image_stream).convert("RGB")).unsqueeze(0).to(device)

    with torch.no_grad():
        feat = model.encode_image(image)

    features_np = feat.cpu().numpy()
    probs = clf.predict_proba(features_np)[0]

    max_index = probs.argmax()
    confidence = float(probs[max_index])
    
    # Use clf.classes_ or mapped labels
    prediction = clf.classes_[max_index]

    return prediction, confidence

def validate_prediction(ai_pred, user_selected):
    """
    Step 8: Validate AI prediction against user selection.
    """
    # Normalize comparison (case insensitive/trimmed)
    if str(ai_pred).strip().lower() != str(user_selected).strip().lower():
        return False, "⚠️ AI detected mismatch. Please report again."
    return True, "✅ Verified successfully"

@app.route("/")
def home():
    return "RoadHazeX V2 API - Active (Hugging Face Ready)"

@app.route("/predict", methods=["POST"])
def predict():
    if not clf:
        return jsonify({"error": "Model not strictly loaded on server"}), 500

    try:
        # Validate request
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        # User selection is optional but recommended for validation step
        user_selected = request.form.get("hazard", "")

        file = request.files["image"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # 1. Prediction with Confidence (Step 7)
        prediction, confidence = predict_with_confidence(file.stream)

        # 2. Validation Logic (Step 8)
        status = True
        message = "✅ AI Confirmed"
        
        if user_selected:
            # Note: We use the server-side validation logic
            status, message = validate_prediction(prediction, user_selected)

        return jsonify({
            "prediction": str(prediction),
            "confidence": confidence,
            "status": status,
            "message": message
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Hugging Face Spaces use port 7860 by default
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False)
