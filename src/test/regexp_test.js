/* eslint-disable no-irregular-whitespace */
/* eslint-disable @typescript-eslint/no-unused-vars */
const string =
    `<label class="sentence">2008 offers&nbsp;<a data-tooltip-position="top" aria-label="" rel="noopener" class="external-link" href="" target="_blank">HierarchyId</a>&nbsp;data type that appears to help with the Lineage Column approach and expand the depth that can be represented.<input type="checkbox"><input class="sentence" value="2008 版本提供了 HierarchyId 数据类型，似乎可以帮助处理血统列方法，并扩展了可以表示的深度。" type="text" style="width: 743.7px;"></label>`

const word = string
    .replace(/<sup[\s\S]*?<\/sup>/g, "")    // 去除[^1]
    .replace(/<[^>]+>/g, '')               // 去除 HTML 标签
    .replace(/&nbsp;/g, ' ')                // 替换 &nbsp; -> 空格

// console.log(word)

console.log(
    "Avoid N+1 via Common Table Expressions in databases that support them" === "Avoid N+1 via Common Table Expressions in databases that support them"
)