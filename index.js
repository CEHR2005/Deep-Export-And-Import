#!/usr/bin/env node
import apolloClient from '@apollo/client';
import fs from 'fs';
import {readFile} from 'fs/promises';
import {program} from 'commander';
import { DeepClient } from "@deep-foundation/deeplinks/imports/client";
import { stripSymbols } from 'apollo-utilities';

const { ApolloClient, InMemoryCache, gql } = apolloClient;

const unloginedDeep = new DeepClient({ apolloClient });
function createApolloClient(uri, token) {
    return new ApolloClient({
        uri,
        cache: new InMemoryCache(),
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
async function getMigrationsEndId(client) {
    const result = await client.query({
        query: gql`
            query Links {
                links(where: {type_id: {_eq: "182"}}) {
                    id
                }
            }
        `
    });
    return result.data.links[0].id;
}
function getLinksGreaterThanId(client, id) {
    return client.query({
        query: gql`query ExportLinks {
            links(order_by: { id: asc }, where: { id: { _gt: ${id} } }) {
                id
                from_id
                to_id   
                type_id
                object {
                    value
                }
                string {
                    value
                }
                number {
                    value
                }
            }
        }
    `,
    })
}
async function saveData(client) {
    getLinksGreaterThanId(client, await getMigrationsEndId(client))
        .then((result) => {
            let links = stripSymbols(result)
            links = links.data.links.slice()
            let newData = links.map(obj => {
                const newObj = { ...obj };
                if (newObj.object !== null) {
                    newObj.object = { data: newObj.object };
                }
                if (newObj.string !== null) {
                    newObj.string = { data: newObj.string };
                }
                if (typeof newObj.number === 'number') {
                    newObj.number = { data: newObj.number };
                }
                return newObj;
            });
            for (let item of newData) {
                if (item.object) {
                    if (item.object.data && item.object.data.__typename) {
                        delete item.object.data.__typename;
                    }
                }
                if (item.string) {
                    if (item.string.data && item.string.data.__typename) {
                        delete item.string.data.__typename;
                    }
                }
                if (item.number) {
                    if (item.number.data && item.number.data.__typename) {
                        delete item.number.data.__typename;
                    }
                }
                if (item.__typename){
                    delete item.__typename
                }
            }

            const now = new Date();
            const filename  = `data-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.json`;
            fs.writeFileSync(filename, JSON.stringify(newData), (err) => {
                if (err) throw err;
                console.log('File saved!');
            });

            console.log(result.data)
        })
        .catch((error) => console.error(error));
}

function deleteLinksGreaterThanId(client, id) {
    client
        .mutate({
            mutation: gql`
        mutation DeleteLinks($id: bigint) {
          delete_links(where: { id: { _gt: $id } }) {
            affected_rows
          }
        }
      `,
            variables: { id },
        })
        .then((result) => {
            console.log(`Deleted ${result.data.delete_links.affected_rows} rows`);
        })
        .catch((error) => console.error(error));
}

async function insertLinksFromFile(client, filename) {
    try {
        const data = await readFile(filename, 'utf8');
        const links = JSON.parse(data);
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            await client.mutate({
                mutation: gql`
          mutation InsertLink(
              $fromId: bigint, 
              $id: bigint,
              $toId: bigint, 
              $typeId: bigint, 
              $string: strings_obj_rel_insert_input,
              $number: numbers_obj_rel_insert_input,
              $object: objects_obj_rel_insert_input
          ) {
            insert_links_one(object: {
                to_id: $toId, 
                type_id: $typeId,
                string: $string,
                number: $number,
                object: $object
                id: $id, 
                from_id: $fromId
            }) {
                id
                from_id
                to_id
                type_id
               
            }
          }
        `,
                variables: {
                    id: link.id,
                    fromId: link.from_id,
                    toId: link.to_id,
                    typeId: link.type_id,
                    string: link.string,
                    number: link.number,
                    object: link.object,

                },
            });
        }
        console.log('Links inserted successfully');
    } catch (error) {
        console.error(error);
    }
}

async function LoadData(client, filename) {
    deleteLinksGreaterThanId(client, await getMigrationsEndId(client))
    await insertLinksFromFile(client, filename)
}
// program
//     .command('Save')
//     .description('Save')
//     .action((uri, token) => {
//         const client = createApolloClient(uri, token)
//         saveData(client)
//     });
//
// program
//     .command('Load')
//     .description('Load')
//     .action((filename, uri, token) => {
//         const client = createApolloClient(uri, token)
//         insertLinksFromFile(filename)
//     });
// program
//     .command('getlinks')
//     .description('getlinks')
//     .action((name, options) => {
//         getLinks().then(r => console.log(r))
//     });
// program.parse(process.argv);

const client = createApolloClient('https://3006-deepfoundation-dev-3mdxq0jv31u.ws-eu94.gitpod.io/gql', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzc2In0sImlhdCI6MTY3OTQxMjU4Mn0.QqCMnR2xUVNKGFwtB0P4piNYtNngvcdz83yYHEEt0mM')
// saveData(client)
LoadData(client, "data-2023-4-15-20-44-26.json")