# RainBank – Every home a mini retention pond
Sime Darby Property University Hackathon 2026 · PLANET · 

Smart rainwater tanks that use AI to cut flash-flood peaks in Shah Alam townships and save water for dry spells.

**Live demo:** https://<your-username>.github.io/rainbank/

## What's inside
- `index.html` – interactive prototype: storm simulation, AI Forecast & Plan, resident app, township dashboard, AI model tab
- `ai/` – training code: data generator (40,000 simulated storms), scikit-learn neural network, exported model

## AI
1. **Predict:** neural network estimates flood risk and peak drain flow from the rainfall forecast (93% accuracy, AUC 0.985 on unseen storms).
2. **Plan:** release planner picks the smallest pre-storm release that keeps drains within capacity.

## Data
All data is synthetic, generated from the stated assumptions (see the Assumptions & Data tab). No proprietary or SDP data is used.
