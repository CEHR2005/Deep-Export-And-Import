#!/usr/bin/env node
import apolloClient from '@apollo/client';
import fs from 'fs';
import {program} from 'commander';
import { stripSymbols } from 'apollo-utilities';
import {insertLinksFromFile} from "./insert.js";

const { ApolloClient, InMemoryCache, gql } = apolloClient;

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
            for (let item of links) {
                if (item.object) {
                    if (item.object && item.object.__typename) {
                        delete item.object.__typename;
                    }
                }
                if (item.string) {
                    if (item.string && item.string.__typename) {
                        delete item.string.__typename;
                    }
                }
                if (item.number) {
                    if (item.number && item.number.__typename) {
                        delete item.number.__typename;
                    }
                }
                if (item.__typename){
                    delete item.__typename
                }
            }

            const now = new Date();
            const filename  = `data-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.json`;
            fs.writeFileSync(filename, JSON.stringify(links), (err) => {
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


async function LoadData(client, filename, gqllink) {
    deleteLinksGreaterThanId(client, await getMigrationsEndId(client))
    await insertLinksFromFile(filename, gqllink)
}
// program
//     .command('Save')
//     .description('Save')
//     .action((uri) => {
//         let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzc2In0sImlhdCI6MTY3OTQxMjU4Mn0.QqCMnR2xUVNKGFwtB0P4piNYtNngvcdz83yYHEEt0mM'
//         const client = createApolloClient(uri, token)
//         saveData(client)
//     });
//
// program
//     .command('Load')
//     .description('Load')
//     .action((filename, uri, token) => {
//         const client = createApolloClient(uri, token)
//         LoadData(filename)
//     });
// program
//     .command('getlinks')
//     .description('getlinks')
//     .action((name, options) => {
//         getLinks().then(r => console.log(r))
//     });
// program.parse(process.argv);

const client = createApolloClient('https://3006-deepfoundation-dev-jpxrtrdvm33.ws-eu94.gitpod.io/gql', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsiYWRtaW4iXSwieC1oYXN1cmEtZGVmYXVsdC1yb2xlIjoiYWRtaW4iLCJ4LWhhc3VyYS11c2VyLWlkIjoiMzc2In0sImlhdCI6MTY3OTQxMjU4Mn0.QqCMnR2xUVNKGFwtB0P4piNYtNngvcdz83yYHEEt0mM')
LoadData(client, "data-2023-4-18-17-4-19.json", 'https://3006-deepfoundation-dev-jpxrtrdvm33.ws-eu94.gitpod.io/gql')
// saveData(client)