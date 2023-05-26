from flask import Flask, render_template, jsonify, request
import json

# ===============================================
# app.py
# ------------
# reads json data to send to viewer
# ===============================================

app = Flask(__name__, static_folder='./static', template_folder='./static')

nodes = {}
edges = []
schema_json = {}

# SDF version 3.0
schema_key_dict = {
    'event': ['@id', 'name', 'comment', 'description', 'aka', 'qnode', 'qlabel', 'isSchema', 'goal', 'ta1explanation', 'importance', 'children_gate', 'instanceOf', 'probParent', 'probChild', 'probability', 'liklihood', 'wd_node', 'wd_label', 'wd_description', 'modality', 'participants', 'privateData', 'outlinks', 'entities', 'relations', 'children', 'optional', 'repeatable'],
    'children': ['child', 'comment', 'optional', 'importance', 'outlinks'],
    'privateData': ['@type', 'template', 'repeatable', 'importance'],
    'entity': ['name', '@id', 'qnode', 'qlabel', 'centrality', 'wd_node', 'wd_label', 'wd_description', 'modality', 'aka','properties'],
    'properties': ['property values'],
    'relation': ['name', 'wd_node', 'wd_label', 'modality', 'wd_description', 'ta1ref', 'relationSubject', 'relationObject', 'relationPredicate']
}

def create_node(_id, _label, _type, _shape=''):
    """Creates a node.

    Parameters:
    _id (str): unique id
    _label (str): label shown in graph
    _type (str): type of node according to schema_key_dict
    _shape (str): shape as visualized in graph
    
    """
    return {
        'data': {
            'id': _id,
            '_label': _label if _label else _id,
            '_type': _type,
            '_shape': _shape
        },
        'classes': ''
    }

def create_edge(_source, _target, _label='', _edge_type=''):
    """Creates an edge whose id is "source_target".

    Parameters:
    _source (str): source node @id
    _target (str): target node @id
    _label (str): label shown in graph
    _edge_type (str): type of edge, influences shape on graph
    
    """
    return {
        'data': {
            'id': f"{_source}__{_target}",
            '_label': f"\n\u2060{_label}\n\u2060",
            'name': _label,
            'source': _source,
            'target': _target,
            '_edge_type': _edge_type
        },
        'classes': ''
    }

def extend_node(node, obj):
    """Adds values to the node according to the node type.

    Parameters:
    node (dict): node to extend
    obj (dict): schema with data on the node
    
    Returns:
    node (dict): extended node
    """

    for key in obj.keys():
        if key in schema_key_dict[node['data']['_type']]:
            if key == 'optional' and obj[key]:
                node['classes'] = 'optional'
            node['data'][key] = obj[key]
    if 'privateData' in obj.keys() and len(obj['privateData']) > 0:
        for key in obj['privateData'].keys():
            if key in schema_key_dict['privateData']:
                node['data'][key] = obj['privateData'][key]
    # print("\nnode from extend_node:", node)
    return node

def get_entities(entities):
    """Creates lists of entity nodes through the schema entity ontology.
    
    Parameters:
    entities (list): information on all entities in a schema

    Returns:
    nodes (dict): entity nodes in the schema
    """
    nodes = {}
    for entity in entities:
        _label = entity['name']
        entity_id = entity['@id']
        nodes[entity_id] = extend_node(create_node(entity_id, _label, 'entity'), entity)
        
    # if entities is empty, add a dummy node
    if len(nodes) == 0:
        nodes['Entities/20000/'] = create_node('Entities/20000/', 'Entity', 'entity')

    # print("\nnodes from get_entities:", nodes)
    return nodes

def get_relations(relations):
    """Creates edges between entities through the schema relation ontology.

    Parameters:
    relations (list): information on all relations in a schema

    Returns:
    nodes (dict): nodes in the schema
    edges (list): edges in the schema
    """
    edges = []
    # 'relation': ['name', 'relationSubject', 'relationPredicate', 'relationObject', '@id']
    for relation in relations:
        edge = create_edge(_source = relation['relationSubject'],
                           _target = relation['relationObject'],
                           _label = relation['name'],
                           _edge_type = 'relation')
        edge['data']['@id'] = relation['@id']
        edge['data']['predicate'] = relation.get('relationPredicate', relation.get('wd_node', ''))
        edges.append(edge)

    # print("\nedges from get_relations:", edges)
    return edges

def handle_containers(nodes, edges, containers):
    """Connects incoming and outgoing edges and removes all unvisualized nodes and edges.
    
    Parameters:
    nodes (dict): nodes in the schema
    edges (list): edges in the schema
    containers (list): list of containers to be processed and removed

    Returns:
    nodes (dict): nodes in the schema
    edges (list): edges in the schema
    """
    edges_to_remove = []
    for container in containers:
        in_edges = []
        out_edges = []
        parent_edge = ['', '']
        # find all edges connected to the container
        for edge in edges:
            if edge['data']['target'] == container:
                if edge['data']['_edge_type'] == 'step_child':
                    parent_edge[0] = edge['data']['source']
                else:
                    in_edges.append(edge['data']['source'])
                edges_to_remove.append(edge)
            if edge['data']['source'] == container:
                if edge['data']['_edge_type'] == 'step_child':
                    parent_edge[1] = edge['data']['target']
                out_edges.append(edge['data']['target'])
                edges_to_remove.append(edge)
        # add hierarchical edge
        if parent_edge[0] != '' and parent_edge[1] != '':
            edges.append(create_edge(parent_edge[0], parent_edge[1], _edge_type='step_child'))
        # attach other edges
        if len(in_edges) == 1:
            for out in out_edges:
                edges.append(create_edge(in_edges[0], out, _edge_type='child_outlink'))
        else:
            for edge in in_edges:
                edges.append(create_edge(edge, out_edges[0], _edge_type='child_outlink'))
        nodes.pop(container)

    for index in edges_to_remove:
        edges.remove(index)
    
    # print("\nnodes from handle_containers:", nodes)
    # print("\nedges from handle_containers:", edges)
    return nodes, edges

def get_nodes_and_edges(schema_json):
    """Creates lists of nodes and edges through the schema event ontology.

    Parameters:
    schemaJson (dict): entire schema in json form

    Returns:
    nodes (dict): nodes in the schema
    edges (list): edges in the schema
    """
    # Iterate through all events. Inside every event, check if there is 'entities', or 'relations' value. If there is, append to entity or relations list
    entity = []
    relations = []

    for event in schema_json['events']:
        if 'entities' in event.keys():
            entity.extend(event['entities'])
        if 'relations' in event.keys():
            relations.extend(event['relations'])


    # get entities and relations
    nodes = get_entities(entity)
    edges = get_relations(relations)

    # get events and attach entities to them
    containers_to_remove = []
    events = schema_json['events']

    for event in events:
        # if node already exists, add information
        _label = event['name'].split('/')[-1].replace('_', ' ').replace('-', ' ')
        event_id = event['@id']
        if event_id in nodes:
            nodes[event_id]['data']['_type'] = 'event'
            nodes[event_id]['data']['_label'] = _label
            nodes[event_id] = extend_node(nodes[event_id], event)
            if 'children' not in event:
                nodes[event_id]['data']['_type'] = 'child'
            elif 'outlinks' in nodes[event_id]['data']['name'].lower():
                nodes[event_id]['data']['_type'] = 'container'
                containers_to_remove.append(event_id)
            else:
                nodes[event_id]['data']['_type'] = 'parent'
                nodes[event_id]['data']['_shape'] = 'diamond'
        else:
            nodes[event_id] = extend_node(create_node(event_id, _label, 'event', 'diamond'), event)
            nodes[event_id]['data']['_type'] = 'parent'

        # not hierarchical node, change node type to a leaf
        if 'children' not in event:
            nodes[event_id]['data']['_type'] = 'child'
            nodes[event_id]['data']['_shape'] = 'ellipse'
        # handle repeatable
        if 'repeatable' in nodes[event_id]['data'] and nodes[event_id]['data']['repeatable']:
            edges.append(create_edge(event_id, event_id, _edge_type='child_outlink'))

        # link participants to entities
        if 'participants' in event:
            for participant in event['participants']:
                _label = participant['roleName']
                entity_id = participant['entity']
                if entity_id == '':
                    entity_id = "Entities/20000/"
                edge = create_edge(event_id, entity_id, _label, _edge_type='step_participant')
                edge['data']['@id'] = participant['@id']
                edges.append(edge)

        # children
        if 'children' in event:
            gate = 'or'
            if nodes[event_id]['data']['children_gate'] == 'xor':
                gate = 'xor'
                xor_id = f'{event_id}xor'
                nodes[xor_id] = create_node(xor_id, 'XOR', 'gate', 'rectangle')
            elif nodes[event_id]['data']['children_gate'] == 'and':
                gate = 'and'
            
            for child in event['children']:       
                child_id = child
                if child_id in nodes:
                    prev_type = nodes[child_id]['data']['_type']
                    nodes[child_id]['data']['_type'] = 'child'
                    # nodes[child_id] = extend_node(nodes[child_id], child)
                    nodes[child_id]['data']['_type'] = prev_type
                else:                    
                    nodes[child_id] = (create_node(child_id, child_id, 'child', 'ellipse'))

                # handle xor gate or just add edges
                if gate == 'xor':
                    edges.append(create_edge(xor_id, child_id, _edge_type='child_outlink'))
                    edges.append(create_edge(event_id, xor_id, _edge_type='step_child'))
                else:
                    edges.append(create_edge(event_id, child_id, _edge_type='child_outlink' if gate == 'and' else 'step_child'))

        # add outlinks
        if event['outlinks']:
            for outlink in event['outlinks']:
                if outlink not in nodes:
                    _label = outlink.split('/')[-1].replace('_', '')
                    nodes[outlink] = create_node(outlink, _label, 'child', 'ellipse')
                edges.append(create_edge(event_id, outlink, _edge_type='child_outlink'))
 
    nodes, edges = handle_containers(nodes, edges, containers_to_remove)

    # find root node(s)
    parentless_edge = {}
    for edge in edges:
        if 'source' in edge['data'] and edge['data']['source'] in nodes:
            if nodes[edge['data']['source']]['data']['_type'] == 'entity':
                parentless_edge[edge['data']['source']] = False
            else:
                parentless_edge[edge['data']['source']] = True
        parentless_edge[edge['data']['target']] = False
    roots = [edge for edge in parentless_edge if parentless_edge[edge] == True]
    for root in roots:
        nodes[root]['data']['_type'] = 'root'

    # TODO: entities and relations
    # Zoey wants an entity-first view, so all entities are shown, with groups of events around them in clusters
        # Q: are we able to make a tab on the viewer itself to switch between views?
        
    # print("\nnodes from get_nodes_and_edges:", nodes)
    # print("\nedges from get_nodes_and_edges:", edges)
    return nodes, edges

# NOTE: These are new??

def fix_participants(schema_json):
    for event in schema_json['events']:
        if 'participants' in event:
            for participant in event['participants']:
                if 'entity' not in participant:
                    participant['entity'] = 'Entities/20000/'
    return schema_json

def fix_entities(schema_json):
    for event in schema_json['events']:
        if 'entities' in event:
            for entity in event['entities']:
                if 'entities' not in entity:
                    entity['entities'] = {
            "@id": "Entities/20000/",
            "name": "Entity",
            "wd_node": "wd:Q1234567",
            "wd_label": "",
            "wd_description": ""
        }
    return schema_json

# TODO: update sideEditor to handle SDF 3.0
@app.route('/update_json', methods=['POST'])
def update_json(values):
    """Updates JSON with values.

    Parameters:
    values (dict): contains node id, and updatedFields dictionary of both keys, and values to change.
    e.g. {'id': 'node_id', 'updatedFields': {key: value, key: value, ...}}

    Returns:
    schemaJson (dict): new JSON 
    """
    global schema_json
    node_id = values['id']
    # print("values:", values)
    node_to_update = None
    for event in schema_json['events']:
        if node_id == event["@id"]:
            node_to_update = event
            break
        if not node_to_update and 'entities' in event:
            for entity in event['entities']:
                if entity['@id'] == node_id:
                    node_to_update = entity
                    break
        if node_to_update:
            break
    
    # Update the node with the new values
    if node_to_update:
        for key, value in values["updatedFields"].items():
            if key != 'id':
                node_to_update[key] = (value == "true") if key in ["repeatable", "optional", "isSchema"] else value

    # TODO:
    # Edit edges:
        # Loop through the events, look for `children`, `outlinks`, `relations` respectively
        # edit these source-target pairs to reflect changes in edges
    # locate the @id and then edit
        
    
    fix_participants(schema_json)
    # fix_entities(schema_json)

    return schema_json



# not passed through here either!
def get_connected_nodes(selected_node):
    """Constructs graph to be visualized by the viewer.

    Parameters:
    selected_node (str): name of node that serves as the topmost node.

    Returns:
    str: name of root node
    dict: list of nodes and list of edges
    
    """

    n = []
    e = []
    id_set = set()
    
    if selected_node == 'root':
        for _, node in nodes.items():
            if node['data']['_type'] == 'root':
                root_node = node
                n.append(node)
                id_set.add(node['data']['id'])
                break
    else:
        root_node = nodes[selected_node]
    # print("Nodes:", nodes)
    # node children
    for edge in edges:
        if edge['data']['source'] == root_node['data']['id']:
            # print("Edge causing KeyError:", edge)
            node = nodes[edge['data']['target']]
            # skip entities
            if selected_node == 'root' and node['data']['_type'] == 'entity':
                continue
            e.append(edge)
            n.append(nodes[edge['data']['target']])
            id_set.add(nodes[edge['data']['target']]['data']['id'])
    
    # causal edges between children
    for id in id_set:
        for edge in edges:
            if edge['data']['source'] == id:
                if edge['data']['_edge_type'] == 'child_outlink':
                    # check if node was created previously
                    if edge['data']['target'] not in id_set:
                        n.append(nodes[edge['data']['target']])
                    e.append(edge)
                if edge['data']['target'] in id_set and edge['data']['_edge_type'] == 'relation':
                    e.append(edge)


    # print("\nroot_node from get_connected_nodes:", root_node)
    # print("\nnodes from get_connected_nodes:", n)
    # print("\nedges from get_connected_nodes:", e)
    return root_node['data']['name'], {'nodes': n, 'edges': e}

@app.route('/')
def homepage():
    return render_template('index.html')

@app.route('/add_event', methods=['GET','POST'])
def append_node():
    """Appends a new event to the schema_json event list.

    input: An already fully generated event.

    Returns:
    schemaJson (dict): updated schema_json with the input appended in the 'events' list.
    """
    global schema_json
    new_event = request.get_json()
    selected_element = new_event['parent_id'] #request.args.get('selected_element')
    del new_event['parent_id']

    # print(f"new_event: {new_event}")
    # print(f"selected_element: {selected_element}")
    # print(f"schema_json: {schema_json}")

    # add new event to events list in schema json
    schema_json['events'].append(new_event)

    # add new event ID to children list of selected element
    for element in schema_json['events']:
        if element.get('@id') == selected_element.get('@id'):
            if 'children' not in element:
                element['children'] = [new_event['@id']]
            else:
                element['children'].append(new_event['@id'])
            break

    # print(f"schema_json: {schema_json}")
    return schema_json

@app.route('/remove_element', methods=['POST'])
def remove_element():
  data = request.json
  element_id = data['id']
  print("element_id:", element_id)
#   element_type = data['type']

  # Remove element from schema_json['events'] list
  for event in schema_json['events']:
    if event['@id'] == element_id:
      schema_json['events'].remove(event)
      break

  # Remove element from all children lists
  for event in schema_json['events']:
    for child in event.get('children', []):
      if child == element_id:
        event['children'].remove(child)

  # Remove element from all outlinks lists
  for event in schema_json['events']:
    outlink_removed = False
    for outlink in event.get('outlinks', []):
      if outlink == element_id:
        event['outlinks'].remove(outlink)
        outlink_removed = True
    if outlink_removed:
      break

  return {'success': True}

@app.route('/add_entity', methods=['POST'])
def add_entity_to_event():
    data = request.json
    event_id = data.get('event_id')
    entity_data = data.get('entity_data')

    # Find the event with the given ID and add the entity to its entities list
    for event in schema_json['events']:
        if event['@id'] == event_id:
            # Ensure the 'entities' key exists in the event dictionary
            if 'entities' not in event:
                event['entities'] = []
            event['entities'].append(entity_data)
    
    # Print the updated schema for confirmation
    # print(json.dumps(schema_json, indent=2))
    
    # Return a success response
    return schema_json

@app.route('/add_participant', methods=['POST'])
def add_participant_to_event():
    data = request.json
    event_id = data.get('event_id')
    participant_data = data.get('participant_data')

    # Find the event with the given ID and add the participant to its participants list
    for event in schema_json['events']:
        if event['@id'] == event_id:
            event['participants'].append(participant_data)
    
    # Print the updated schema for confirmation
    # print(json.dumps(schema_json, indent=2))
    
    # Return a success response
    return schema_json

@app.route('/add_outlink', methods=['POST'])
def add_outlink():
    global schema_json
    data = request.get_json()
    from_node_id = data.get('fromNodeId')
    to_node_id = data.get('toNodeId')
    print(f"from_node_id: {from_node_id}")
    print(f"to_node_id: {to_node_id}")

    # Find the event with the matching @id field
    for event in schema_json['events']:
        if event.get('@id') == from_node_id:
            # Check if to_node_id already exists in outlinks
            if 'outlinks' not in event:
                event['outlinks'] = [to_node_id]
            elif to_node_id not in event['outlinks']:
                event['outlinks'].append(to_node_id)
            break

    # get the updated nodes and edges
    global nodes
    global edges
    nodes, edges = get_nodes_and_edges(schema_json)
    schema_name, parsed_schema = get_connected_nodes('root')

    # return the updated parsedSchema and schemaJson
    return json.dumps({
        'parsedSchema': parsed_schema,
        'name': schema_name,
        'schemaJson': schema_json
    })

@app.route('/add_relation', methods=['POST'])
def add_relation():
    global schema_json
    data = request.get_json()
    from_node_id = data.get('fromNodeId')
    to_node_id = data.get('toNodeId')
    relation = data.get('relation')

    print(f"from_node_id: {from_node_id}")
    print(f"to_node_id: {to_node_id}")
    print(f"relation: {relation}")

    # Find the event which contains the relationSubject entity
    for event in schema_json['events']:
        for entity in event.get('entities', []):
            if entity.get('@id') == from_node_id:
                if 'relations' not in event:
                    event['relations'] = [relation]
                else:
                    event['relations'].append(relation)
                break
    
    nodes, edges = get_nodes_and_edges(schema_json)
    schema_name, parsed_schema = get_connected_nodes('root')
    
    return json.dumps({
        'parsedSchema': parsed_schema,
        'name': schema_name,
        'schemaJson': schema_json
    })

@app.route('/get_all_entities', methods=['GET'])
def get_all_entities():
    entities_dict = {}

    # Populate the entities_dict with basic information about the entities
    for event in schema_json['events']:
        for entity in event.get('entities', []):
            entity_id = entity.get('@id')
            if entity_id not in entities_dict:
                entity_info = {
                    '@id': entity_id,
                    'name': entity.get('name'),
                    'wd_node': entity.get('wd_node'),
                    'wd_label': entity.get('wd_label'),
                    'wd_description': entity.get('wd_description'),
                    'created_in': [],
                    'participant_in': []
                }
                entities_dict[entity_id] = entity_info

            if event.get('@id') not in entities_dict[entity_id]['created_in']:
                entities_dict[entity_id]['created_in'].append(event.get('name'))

    # Add participant information to the entities in entities_dict
    for event in schema_json['events']:
        participants = event.get('participants', [])
        for participant in participants:
            participant_entity_id = participant.get('entity')
            if participant_entity_id in entities_dict:
                if event.get('@id') not in entities_dict[participant_entity_id]['participant_in']:
                    entities_dict[participant_entity_id]['participant_in'].append(event.get('name'))

    entities = list(entities_dict.values())
    return jsonify(entities)

@app.route('/upload', methods=['POST'])
def upload():
    """Uploads JSON and processes it for graph view."""
    file = request.files['file']
    schema_string = file.read().decode("utf-8")
    global schema_json
    global nodes
    global edges
    global schema_name
    schema_json = json.loads(schema_string)
    
    # if is_ta2_format(schema_json):
    #     schema_json = convert_ta2_to_ta1_format(schema_json)
        
    nodes, edges = get_nodes_and_edges(schema_json)
    schema_name, parsed_schema = get_connected_nodes('root')
    return json.dumps({
        'parsedSchema': parsed_schema,
        'name': schema_name,
        'schemaJson': schema_json
    })

@app.route('/delete_entity', methods=['DELETE'])
def delete_entity():
    entity_id = request.json.get('entity_id')

    # Remove the entity from the schema_json['events']['entities']
    for event in schema_json['events']:
        if 'entities' in event:
            event['entities'] = [entity for entity in event['entities'] if entity.get('@id') != entity_id]

    # Remove the entity from the participants' 'entity' field
    for event in schema_json['events']:
        if 'participants' in event:
            event['participants'] = [
                participant for participant in event['participants'] if participant.get('entity') != entity_id
            ]
            
    # Remove relations with matching relationSubject or relationObject
    for event in schema_json['events']:
        if 'relations' in event:
            event['relations'] = [
                relation for relation in event['relations']
                if relation.get('relationSubject') != entity_id and relation.get('relationObject') != entity_id
            ]
    
    # Reload the schema to update the nodes and edges
    nodes, edges = get_nodes_and_edges(schema_json)
    
    return jsonify({
        'nodes': nodes,
        'edges': edges
    })

# TODO: get_subtree_or_update_node not accessed
@app.route('/node', methods=['GET', 'POST'])
def get_subtree_or_update_node():
    if not (bool(nodes) and bool(edges)):
        return 'Parsing error! Upload the file again.', 400

    if request.method == 'GET':        
        """Gets subtree of the selected node."""
        node_id = request.args.get('ID')
        _, subtree = get_connected_nodes(node_id)
        return json.dumps(subtree)
    else:
        """Posts updates to selected node and reloads schema."""
        values = json.loads(request.data.decode("utf-8"))
        new_json = update_json(values)
        # print("\nnew_json from get_subtree_or_update_node:", new_json)
        return json.dumps(new_json)

# TODO: reload_schema not accessed
@app.route('/reload', methods=['POST'])
def reload_schema():
    """Reloads schema; does the same thing as upload."""
    schema_string = request.data.decode("utf-8")
    global schema_json
    global nodes
    global edges
    global schema_name
    schema_json = json.loads(schema_string)
    nodes, edges = get_nodes_and_edges(schema_json)
    schema_name, parsed_schema = get_connected_nodes('root')
    # print("\nschema_name from reload_schema:", schema_name)
    # print("\nparsed_schema from reload_schema:", parsed_schema)
    # print("\nschema_json from reload_schema:", schema_json)    
    return json.dumps({
        'parsedSchema': parsed_schema,
        'name': schema_name,
        'schemaJson': schema_json
    })