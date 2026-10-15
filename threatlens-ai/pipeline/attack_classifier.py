import joblib
import numpy as np
import os

class AttackClassifier:
    def __init__(self, model_path=None):
        if model_path is None:
            # Get absolute path to models relative to this file
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, 'models', 'random_forest_final.pkl')
        
        self.model = joblib.load(model_path)

    def classify(self, features):
        """
        Predicts the specific attack type.
        features: list or numpy array of numerical features.
        """
        feat_array = np.array(features).reshape(1, -1)
        prediction = self.model.predict(feat_array)
        return prediction[0]
