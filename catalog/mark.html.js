export const add = (data) => `?m=${data?.m || ''}:`
// {client.set:}{(config.clearlinkfilter?~false?Crumb.get.m)?:client}
// {client.aset:}{Crumb.get.m?:aclient}
// {client.add:}{:client}:
//     {client:}?m={Crumb.get.m}
//     {aclient:}&amp;m={Crumb.get.m}
// {server.set:}{config.clearlinkfilter??(data.m?:server)}
// {server.add:}{:server}:
//     {server:}?m={config.clearlinkfilter??data.m}
//     {aserver:}&amp;m={config.clearlinkfilter??data.m}
// {set:}{config.clearlinkfilter??(data.m?:server)}
// {aset:}{config.clearlinkfilter??(data.m?:aserver)}
// {add:}{:server}:
export default { add } 