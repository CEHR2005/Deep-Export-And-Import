#!/usr/bin/env node
import apolloClient from '@apollo/client';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { stripSymbols } from 'apollo-utilities';
import {insertLinksFromFile} from "./insert.js";
import moment from "moment";
const { ApolloClient, InMemoryCache, gql } = apolloClient;
var current_time = Date.now();

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
async function saveData(url, jwt, filename  = `./Saves/dump-${moment(current_time).format("YYYY-MM-DD-HH-mm-ss")}.json`

) {
    const client = createApolloClient(url, jwt)
    getLinksGreaterThanId(client, await getMigrationsEndId(client))
        .then((result) => {
            let links = stripSymbols(result)
            links = links.data.links.slice()
            for (let item of links) {
                if (item?.object?.__typename) {
                    delete item.object.__typename;
                }
                if (item?.string?.__typename) {
                    delete item.string.__typename;
                }
                if (item?.number?.__typename) {
                    delete item.number.__typename;
                }
                if (item?.__typename){
                    delete item.__typename
                }
            }

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


async function loadData(url, jwt, filename) {
    const client = createApolloClient(url, jwt)
    deleteLinksGreaterThanId(client, await getMigrationsEndId(client))
    await insertLinksFromFile(filename, url)
}


yargs(hideBin(process.argv))
    .command('deep-export', 'Export data', (yargs) => {
        return yargs
            .option('url', { describe: 'The url to export data from', type: 'string', demandOption: true })
            .option('jwt', { describe: 'The JWT token', type: 'string', demandOption: true })
            .option('file', { describe: 'The file to save data to', type: 'string', demandOption: false });
    }, (argv) => {
        saveData(argv.url, argv.jwt, argv.file)
            .catch((error) => console.error(error));
    })
    .command('deep-import', 'Import data', (yargs) => {
        return yargs
            .option('url', { describe: 'The url to import data to', type: 'string', demandOption: true })
            .option('jwt', { describe: 'The JWT token', type: 'string', demandOption: true })
            .option('file', { describe: 'The file to load data from', type: 'string', demandOption: true });
    }, (argv) => {
        loadData(argv.url, argv.jwt, argv.file).catch((error) => console.error(error))
    })
    .demandCommand(1, 'You need at least one command before moving on')
    .help()
    .argv;