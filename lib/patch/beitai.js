/* beitai.js */

/**
  @info Beitai special patch

  1. Call once on job create with empty data;
  2. Call after job per-execute;
  3. Template format is 'url-with-{:seq}-others';
  4. May generic as 'template-url-with-{@max(:data.Events.*.SequenceNum)}';
 */

var assert = require('assert');

module.exports = function (task, data) {
  if (!task.urlTemplate) return;

  if (data && Array.isArray(data['Events']) && data['Events'].length) {
    var seq = data['Events'].map(function (o) { return o && o['SequenceNum'] || 0; });
    var max = Math.max.apply(Math, seq);

    if (isFinite(max)) {
      task.url = replaceUrl(task.urlTemplate, max);
      task.hash = null;
    }
  }
}

function replaceUrl(tpl, v) {
  return tpl.replace(/\{\:seq\}/, v);
}
