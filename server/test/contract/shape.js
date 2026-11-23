function shapeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return value.length > 0 ? [shapeOf(value[0])] : [];
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    if (keys.length > 12) {
      return { '*': shapeOf(value[keys[0]]) };
    }
    const output = {};
    for (const key of keys) output[key] = shapeOf(value[key]);
    return output;
  }
  return typeof value;
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

const SENSITIVE_KEYS = ['email', 'password_hash', 'user_id', 'points', 'interest_tag'];

module.exports = { shapeOf, collectKeys, SENSITIVE_KEYS };