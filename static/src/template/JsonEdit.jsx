import React, { Component } from 'react';

import JSONEditor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.min.css';

export default class JSONEdit extends Component {
    constructor(props) {
        super(props);

        this.handleEvent = this.handleEvent.bind(this);
    }

    // sends JSON back to Viewer when field is out of focus
    handleEvent(node, event) {
        if (event.type === 'blur') {
            this.props.parentCallback(this.jsoneditor.get());
        }
    }

    componentDidMount() {
        const options = {
            mode: 'tree',
            enableTransform: false,
            onEvent: this.handleEvent,
            templates: [
                {
                    text: 'Importance',
                    title: 'Insert Importance',
                    field: '',
                    value: {
                        'probParent': '@id',
                        'probChild': '@id',
                        'probability': 0.0
                    }
                },
                {
                    text: 'Likelihood',
                    title: 'Insert Likelihood',
                    field: '',
                    value: {
                        'probParent': '@id',
                        'probChild': '@id',
                        'probability': 0.0
                    }
                },
                {
                    text: 'Modality',
                    title: 'Insert Modality',
                    field: '',
                    value: {
                        'modality': ['generic', 'hedged', 'irrealis', 'negated']
                    }
                },
                {
                    text: 'Participant',
                    title: 'Insert Participant',
                    field: '',
                    value: {
                        '@id': '',
                        'roleName': 'consult_XPO',
                        'entity': ''
                    }
                },
                {
                    text: 'Property',
                    title: 'Insert Property',
                    field: '',
                    value: {
                        '@id': '',
                        'name': '',
                        'wd_node': '',
                        'wd_label': '',
                        'wd_description': '',
                        'time_date': '',
                        'value': ''
                    }
                },
                {
                    text: 'Event',
                    title: 'Insert Event',
                    field: '',
                    value: {
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
                    }
                },
                {
                    text: 'Entity',
                    title: 'Insert Entity',
                    field: '',
                    value: {
                        '@id': '',
                        'name': '',
                        'wd_node': '',
                        'wd_label': '',
                        'wd_description': ''
                    }
                },
                {
                    text: 'Relation',
                    title: 'Insert Relation',
                    field: '',
                    value: {
                        '@id': '',
                        'name': '',
                        'relationSubject': '',
                        'relationObject': '',
                        'wd_node': '',
                        'wd_label': '',
                        'wd_description': ''
                    }
                },
                {
                    text: 'Container',
                    title: 'Insert Container',
                    field: '',
                    value: {
                        '@id': '',
                        'name': '',
                        'comment': '',
                        'isSchema': true,
                        'optional': false,
                        'children_gate': 'xor',
                        'children': [],
                        'outlinks': []
                    }
                },
                {
                    text: 'Container Event',
                    title: 'Insert Container Event',
                    field: '',
                    value: {
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
                    }
                }
            ]
        };

        this.jsoneditor = new JSONEditor(this.container, options);
        this.jsoneditor.set(this.props.schemaJson);
        console.log('Data received in JSONEdit: ', this.props.schemaJson);

    }

    componentWillUnmount() {
        if (this.jsoneditor) {
            this.jsoneditor.destroy();
        }
    }

    componentDidUpdate() {
        console.log('schemaJson prop in JsonEdit:', this.props.schemaJson);
        this.jsoneditor.update(this.props.schemaJson);
    }

    render() {
        return (
            <div id="schema-json" className="jsoneditor-react-container" ref={elem => this.container = elem} />
        );
    }
}