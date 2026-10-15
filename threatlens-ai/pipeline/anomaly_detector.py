import joblib
import numpy as np
import os

class AnomalyDetector:
    def __init__(self, model_path=None, scaler_path=None):
        if model_path is None or scaler_path is None:
            # Get absolute path to models relative to this file
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, 'models', 'isolation_forest_final.pkl')
            scaler_path = os.path.join(base_dir, 'models', 'if_scaler.pkl')
        
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

    def is_anomaly(self, features):
        """
        Returns True if the traffic is anomalous, False if benign.
        features: list or numpy array of numerical features.
        """
        # Ensure features are in 2D array for scaler
        feat_array = np.array(features).reshape(1, -1)
        scaled_feat = self.scaler.transform(feat_array)
        
        # Isolation Forest: 1 = normal, -1 = anomaly
        prediction = self.model.predict(scaled_feat)
        return prediction[0] == -1
