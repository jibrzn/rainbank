"""Train the RainBank flood-risk predictor (AI part 1: Predict).

Inputs (known ~3 h before the storm): forecast rain depth, duration, timing of the rain peak,
how full the household tanks are, and drain capacity (per 100 homes).
Outputs (if nobody acts, i.e. today's passive tanks): probability of street flooding, and the
expected peak drain flow. Trained on synthetic storms from generate_data.js, which uses the same
simulation engine as the prototype. Exports weights to model.json for the browser.
Usage: python3 train_model.py storms.csv model.json
"""
import json, sys
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.metrics import roc_auc_score, accuracy_score, f1_score, r2_score, brier_score_loss

src, out = sys.argv[1], sys.argv[2]
d = np.genfromtxt(src, delimiter=',', names=True)
BASE = ['fc_depth_mm', 'duration_min', 'peak_pos', 'tank_start', 'cap_ls_per_100homes']
FEATS = BASE + ['intensity_mmh', 'depth_per_cap']          # engineered: mm/h, and rain relative to drain capacity


def features(c):
    return np.column_stack([c[f] for f in BASE] + [c['fc_depth_mm'] / c['duration_min'] * 60,
                                                    c['fc_depth_mm'] / c['cap_ls_per_100homes'] * 100])


X = features(d); y = d['flood'].astype(int); yp = np.log(d['peak_ls_per_100homes'])
Xtr, Xte, ytr, yte, ptr, pte = train_test_split(X, y, yp, test_size=0.2, random_state=42)
sc = StandardScaler().fit(Xtr); Str, Ste = sc.transform(Xtr), sc.transform(Xte)
clf = MLPClassifier(hidden_layer_sizes=(64, 32), alpha=1e-3, max_iter=800, early_stopping=True, random_state=1).fit(Str, ytr)
reg = MLPRegressor(hidden_layer_sizes=(64, 32), alpha=1e-3, max_iter=1000, early_stopping=True, random_state=1).fit(Str, ptr)

p = clf.predict_proba(Ste)[:, 1]; pred = (p >= 0.5).astype(int)
pk_pred, pk_true = np.exp(reg.predict(Ste)), np.exp(pte)
m = {'accuracy': float(accuracy_score(yte, pred)), 'auc': float(roc_auc_score(yte, p)), 'f1': float(f1_score(yte, pred)),
     'brier': float(brier_score_loss(yte, p)), 'flood_rate': float(yte.mean()),
     'peak_r2': float(r2_score(pk_true, pk_pred)), 'peak_mape_pct': float(np.mean(np.abs(pk_pred - pk_true) / pk_true) * 100),
     'n_total': int(len(X)), 'n_train': int(len(Xtr)), 'n_test': int(len(Xte))}
rng = np.random.default_rng(0); imp = {}
for i, f in enumerate(FEATS):
    Xp = Ste.copy(); Xp[:, i] = rng.permutation(Xp[:, i]); imp[f] = float(m['auc'] - roc_auc_score(yte, clf.predict_proba(Xp)[:, 1]))
m['importance'] = imp
idx = rng.choice(len(Ste), 300, replace=False)
m['scatter'] = [[round(float(pk_true[i]), 1), round(float(pk_pred[i]), 1)] for i in idx]   # L/s per 100 homes

layers = lambda mdl: [{'W': W.T.round(6).tolist(), 'b': b.round(6).tolist()} for W, b in zip(mdl.coefs_, mdl.intercepts_)]
json.dump({'features': FEATS, 'scaler': {'mean': sc.mean_.round(6).tolist(), 'scale': sc.scale_.round(6).tolist()},
           'classifier': layers(clf), 'regressor': layers(reg), 'metrics': m}, open(out, 'w'), separators=(',', ':'))
print(json.dumps({k: v for k, v in m.items() if k != 'scatter'}, indent=1))
chk = {'fc_depth_mm': np.array([20., 35., 50., 80.]), 'duration_min': np.array([120., 60., 120., 120.]), 'peak_pos': np.array([.35] * 4),
       'tank_start': np.array([.5] * 4), 'cap_ls_per_100homes': np.array([175.] * 4)}
print('default scenarios 20/35/50/80 mm -> flood prob:', clf.predict_proba(sc.transform(features(chk)))[:, 1].round(2).tolist(),
      'peak L/s (200 homes):', (np.exp(reg.predict(sc.transform(features(chk)))) * 2).round(0).tolist())
