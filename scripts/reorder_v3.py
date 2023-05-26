import json
import getopt, sys
import glob
import csv
import re

def NewId(currId, num, prefix, idDict = None):
    assert isinstance(num, int), f"Expected integer for num, got {type(num).__name__}"
    newId = re.sub(r'(\d+)', f"{'0'*(5 - len(str(num)))}{num}", currId, 1)
    if not newId.startswith('resin:'):
        newId = 'resin:' + newId
        
    parts = newId.split('/')
    if len(parts) > 1:
        parts[-1] = parts[-1].replace(' ', '_')
    newId = '/'.join(parts)

    if idDict is not None:
        assert newId not in idDict.values(), f"Duplicated new @id: {newId}"
        idDict[currId] = newId
    num += 1
    return newId, num, idDict

def process_file(input_file, verbose):
    file = input_file[:-5]
    if verbose: print("Reading file...", end='')
    with open(f'{file}.json', encoding='utf8') as f:
        schema_string = f.read()
    schemaJson = json.loads(schema_string)
    if verbose: print("done.")

    if verbose: print("Reordering entities, events, participants, and relations...", end='')
    events = schemaJson['events']

    idDict = {"Events": (20000, {}), "Entities": (10000, {}), "Participants": (30000, {}), "Relations": (40000, {})}

    def update_nested_fields(field, field_type):
        oldId = field['@id']
        num, idMap = idDict[field_type]
        newId, num, idMap = NewId(field['@id'], num, field_type, idMap)
        assert newId != oldId, f"Expected new @id to be different from old @id"
        field['@id'] = newId
        idDict[field_type] = (num, idMap)

    for event in events:
        # Update '@id' field for events
        num, idMap = idDict['Events']
        newId, num, idMap = NewId(event['@id'], num, "Events", idMap)
        event['@id'] = newId
        idDict['Events'] = (num, idMap)

        # Update 'entities' field
        if 'entities' in event:
            for entity in event['entities']:
                update_nested_fields(entity, 'Entities')

        # Update 'participants' field
        if 'participants' in event:
            for participant in event['participants']:
                update_nested_fields(participant, 'Participants')
                # Update 'entity' field within 'participants'
                if 'entity' in participant:
                    if participant['entity'] in idDict['Entities'][1]:
                        participant['entity'] = idDict['Entities'][1][participant['entity']]

        # Update 'relations' field
        if 'relations' in event:
            for relation in event['relations']:
                update_nested_fields(relation, 'Relations')

    # After all events have been processed, update 'children' field
    for event in events:
        if 'children' in event:
            newChildren = []
            for oldChildId in event['children']:
                if oldChildId in idDict['Events'][1]:
                    newChildren.append(idDict['Events'][1][oldChildId])
            if newChildren:
                event['children'] = newChildren

    if verbose: print("done.")

    # After all @id have been updated, update 'outlinks', 'relationSubject' and 'relationObject' fields
    if verbose: print("Updating outlinks, relationSubjects, and relationObjects...", end='')
    for event in events:
        if 'outlinks' in event:
            newOutlinks = []
            for oldOutlink in event['outlinks']:
                if oldOutlink in idDict['Events'][1]:
                    newOutlinks.append(idDict['Events'][1][oldOutlink])
            if newOutlinks:
                event['outlinks'] = newOutlinks

        if 'relations' in event:
            for relation in event['relations']:
                if 'relationSubject' in relation:
                    if relation['relationSubject'] in idDict['Entities'][1]:
                        relation['relationSubject'] = idDict['Entities'][1][relation['relationSubject']]
                if 'relationObject' in relation:
                    if relation['relationObject'] in idDict['Entities'][1]:
                        relation['relationObject'] = idDict['Entities'][1][relation['relationObject']]
    if verbose: print("done.")

    if verbose: print("Writing output...", end='')
    with open(f'{file}_reordered.json', 'w', encoding='utf8') as f:
        json.dump(schemaJson, f, ensure_ascii=False, indent=4)
    if verbose: print("done.")

    if verbose: print("Saving id mapping to csv...", end='')
    with open(f'{file}_id_mapping.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['old_id', 'new_id'])
        for _, (_, idMap) in idDict.items():
            for old_id, new_id in idMap.items():
                writer.writerow([old_id, new_id])
    if verbose: print("done.")

def main(argv):
    h = """
    reorder.py
    ...
    ======================================================================
    -h      help
    -v      verbose output, i.e. prints which step the program is on
    """
    # obtain arguments
    v = 0
    try:
        opts, _ = getopt.getopt(argv, "hv", ["help", "verbose"])
    except getopt.GetoptError:
        print(h)
        sys.exit(2)
    for opt, _ in opts:
        if opt in ("-h", "--help"):
            print(h)
            sys.exit()
        elif opt in ("-v", "--verbose"):
            v = 1

    json_files = glob.glob('./*.json')

    for json_file in json_files:
        process_file(json_file, v)

if __name__ == "__main__":
    main(sys.argv[1:])