'use strict';
// Narrow regression guard for retired prescriptions, NOT a natural-language policy verifier.
const retired = [
 {file:'references/visual-system.md',text:'确有安全需求的小面积语义色',reason:'Do not limit all useful semantic color to safety warnings.'},
 {file:'references/visual-system.md',text:'历史暖色与珊瑚色 UI 分支已被本次统一要求取代',reason:'Historical migration is not current authorization.'},
 {file:'references/visual-system.md',text:'辅助区、凹入区域',reason:'workspace does not implement sunken depth in both themes.'},
 {file:'references/product-profiles.md',text:'本轮确定统一视觉系统',reason:'Project history must not masquerade as the current round.'},
 {file:'references/task-workflows.md',text:'最后增加玻璃或动效',reason:'Effects are optional, not a required final phase.'}
];
function findKnownConflicts(read) {
 return retired.filter(rule=>read(rule.file).includes(rule.text));
}
module.exports={retired,findKnownConflicts};
