const path = require('path');
const fs = require('fs');

function processBuildInfo(source, name, data) {
  const {abi, devdoc = {}, userdoc = {}} = data.output.contracts[source][name];

  const {title, author, details} = devdoc;
  const {notice} = userdoc;

  // derive external signatures from internal types

  const getSigType = function ({type, components = []}) {
    return type.replace('tuple', `(${components.map(getSigType).join(',')})`);
  };

  const members = abi.reduce((acc, el) => {
    // constructor, fallback, and receive do not have names
    const name =
      el.name || (el.type === 'constructor' ? 'contractConstructor' : el.type);
    const inputs = el.inputs || [];
    const sig = `${name}(${inputs.map(getSigType)})`;
    acc[sig] = {
      ...el,
      signature: sig,
      ...(devdoc.events && devdoc.events[sig] ? devdoc.events[sig] : {}),
      ...(devdoc.methods && devdoc.methods[sig] ? devdoc.methods[sig] : {}),
      ...(devdoc.stateVariables && devdoc.stateVariables[name]
        ? {
            ...devdoc.stateVariables[name],
            type: 'stateVariable',
            returns: {_0: devdoc.stateVariables[name]['return']},
          }
        : {}),
      ...(userdoc.methods && userdoc.methods[sig] ? userdoc.methods[sig] : {}),
      ...(userdoc.events && userdoc.events[sig] ? userdoc.events[sig] : {}),
      ...(el.type === 'constructor' ? {type: 'contractConstructor'} : {}),
    };
    return acc;
  }, {});
  const membersByType = Object.keys(members).reduce((acc, sig) => {
    const {type} = members[sig];
    acc[type] = acc[type] || {};
    acc[type][sig] = members[sig];
    return acc;
  }, {});

  return {
    // metadata
    source,
    name,
    // top-level docs
    title,
    author,
    details,
    notice,
    // Members
    membersByType,
  };
}

const titleNoticeDetailsAuthor = (obj) => [
  obj.title && [`> Title: ${obj.title}`, ''],
  obj.notice && [`> Notice: ${obj.notice}`, ''],
  obj.details && [`> Details: ${obj.details}`, ''],
  obj.author && [`> Author: ${obj.author}`, ''],
];

const renderAttrs = (member) => [
  (member.payable || member.stateMutability === 'payable') && 'payable',
  (member.constant || member.stateMutability === 'constant') && 'constant',
  (member.view || member.stateMutability === 'view') && 'view',
  (member.anonymous || member.stateMutability === 'anonymous') && 'anonymous',
];
const renderArgumentList = (inputs) => inputs.map((i) => i.name).join(', ');

const description = (entry, params, idx) =>
  params &&
  (entry.name.length === 0 && params['_' + idx]
    ? params['_' + idx]
    : params[entry.name]);

const renderTable = (type, entry, params) => [
  '| **name** | **type** | **description** |',
  '|-|-|-|',
  entry.map(
    (e, idx) =>
      '| ' +
      [
        e.name,
        `${e.type}`,
        type === 'event'
          ? e.indexed
            ? 'indexed'
            : 'not indexed'
          : description(e, params, idx),
      ].join(' | ') +
      ' |'
  ),
  '',
];

const renderMembers = (name, members) =>
  members &&
  Object.keys(members).length > 0 &&
  Object.values(members).map((m) => [
    m.type === 'contractConstructor'
      ? [
          `## *constructor*`,
          '',
          `***constructor(${renderArgumentList(m.inputs || [])})***`,
        ]
      : [
          `## *${m.type}* ${m.name}`,
          '',
          `***${name}.${m.name}(${renderArgumentList(
            m.inputs || []
          )}) ${renderAttrs(m).filter((x) => x)}***`,
        ],
    '',
    titleNoticeDetailsAuthor(m),
    m.inputs &&
      m.inputs.length > 0 && [
        'Arguments',
        '',
        renderTable(m.type, m.inputs, m.params || {}),
      ],
    m.outputs &&
      m.outputs.length > 0 && [
        'Outputs',
        '',
        renderTable(m.type, m.outputs, m.returns),
      ],
    '',
    '',
  ]);

function render(source, name, data) {
  const info = processBuildInfo(source, name, data);
  const printOrder = [
    'contractConstructor',
    'receive()',
    'fallback()',
    'event',
    'stateVariable',
    'function',
  ];
  const output = [
    `# ${name}`,
    '',
    `${source}`,
    '',
    titleNoticeDetailsAuthor(info),
    ...printOrder.map((p) => renderMembers(name, info.membersByType[p])),
  ];
  return output
    .flat(Infinity)
    .filter((x) => x === '' || x)
    .join('\n');
}

module.exports = async function (dirName, sourceFileName, contractName, info) {
  const fileName = path.basename(contractName, path.extname(contractName));
  fs.writeFileSync(
    path.join(dirName, fileName + '.md'),
    render(sourceFileName, contractName, info)
  );
};
