#!/bin/bash

APP_DIR=/data/KAIROS/git/schema-interface
PATH=$APP_DIR/venv/bin:$PATH

echo "Creating bundle.js"

cd "$APP_DIR"/static
npm install
npm run build
cd "$APP_DIR"

echo "Starting server"

export FLASK_APP=app.py
export FLASK_ENV=production
flask run -p 8081
