import json

import numpy as np
import pandas as pd


class NpEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        if isinstance(o, pd.Timestamp):
            return str(o)
        return super().default(o)


def to_native(obj):
    return json.loads(json.dumps(obj, cls=NpEncoder, default=str))

