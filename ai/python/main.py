from flask import Flask
from api.routes import api_blueprint
from database.mongo_connector import MongoConnector

app = Flask(__name__)

# Configuration Flask
app.config["MONGO_URI"] = "mongodb://localhost:27017/supa_quizz"
mongo = MongoConnector(app.config["MONGO_URI"])

# Enregistrement des routes API
app.register_blueprint(api_blueprint)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
