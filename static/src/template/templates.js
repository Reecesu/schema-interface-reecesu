/**
 * To call templates:
 * const newChapterEvent = { ...templates.chapterEvent };
 * const newPrimitiveEvent = { ...templates.primitiveEvent };
 */

const templates = {
    chapterEvent: {
      '@id': '',
      'name': '',
      'description': '',
      'wd_node': '',
      'wd_label': '',
      'wd_description': '',
      'isSchema': true,
      'repeatable': false,
      'optional': false,
      'children_gate': 'or',
      'outlinks': [],
      'participants': [],
      'children': [],
      'modality': [],
      'entities': [],
      'relations': [],
      'importance': [],
      'likelihood': []
    },
    primitiveEvent: {
      '@id': '',
      'name': '',
      'description': '',
      'wd_node': '',
      'wd_label': '',
      'wd_description': '',
      'isSchema': false,
      'repeatable': false,
      'optional': false,
      'outlinks': [],
      'participants': [],
      'modality': [],
      'importance': [],
      'likelihood': [],
      'entities': [],
      'relations': []
    },
    xorGate: {
      '@id': '',
      'name': '',
      'comment': '',
      'isSchema': true,
      'optional': false,
      'children_gate': 'xor',
      'children': [],
      'outlinks': []
    },
    entity: {
      '@id': '',
      'name': '',
      'wd_node': '',
      'wd_label': '',
      'wd_description': ''
    },
    relation: {
      '@id': '',
      'name': '',
      'relationSubject': '',
      'relationObject': '',
      'wd_node': '',
      'wd_label': '',
      'wd_description': ''
    },
    participant: {
      '@id': '',
      'roleName': 'consult_XPO',
      'entity': ''
    }
};

export default templates;