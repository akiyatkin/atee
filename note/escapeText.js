const escapeText = (text) => text.replace(/[<>&]/g, tag => ({"<": '&lt;','>': '&gt;','&': '&amp;'})[tag] || tag)
export default escapeText