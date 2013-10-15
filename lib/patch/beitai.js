/* beitai.js */

/**
  @info Beitai special patch

  1. Call after task per-executes;
  2. Template format is 'url-with-{:seq}-others';
  3. May generic as 'template-url-with-{@max(:data.Events.*.SequenceNum)}';
 */

var SINTINELS = 10;

module.exports = function (task, data) {
  if (!task.urlTemplate) return;

  if (data && Array.isArray(data['Events']) && data['Events'].length >= SINTINELS) {
    var evs = data['Events'].map(function (o) { return o && o['SequenceNum'] || 0; })
                            .sort(function (l,r) { return l-r; });
    var seq = evs[evs.length - SINTINELS];

    if (!isNaN(seq)) {
      task.url = replaceUrl(task.urlTemplate, seq - 0.001);
      return;
    }
  }

  task.url = replaceUrl(task.urlTemplate, 0);
  return;
}

function replaceUrl(tpl, v) {
  return tpl.replace(/\{\:seq\}/, v);
}
