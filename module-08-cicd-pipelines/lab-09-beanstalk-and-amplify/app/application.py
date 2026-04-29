"""Tiny Flask app for Beanstalk Python platform. Beanstalk looks for `application` (callable) by default."""
from flask import Flask

application = Flask(__name__)


@application.route("/")
def hello():
    return "hello from beanstalk\n"


if __name__ == "__main__":
    application.run(host="0.0.0.0", port=8000)
