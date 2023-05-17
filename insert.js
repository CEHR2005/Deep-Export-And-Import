import {DeepClient} from "@deep-foundation/deeplinks/imports/client.js";
import {readFile} from "fs/promises";
import {generateApolloClient} from "@deep-foundation/hasura/client.js";


async function createDeepClient(gqllink) {
    const apolloClient = generateApolloClient({
        path: gqllink.replace("https://", ""),
        ssl: 1,
    });

    const unloginedDeep = new DeepClient({apolloClient});
    const guest = await unloginedDeep.guest();
    const guestDeep = new DeepClient({deep: unloginedDeep, ...guest});
    const admin = await guestDeep.login({
        linkId: await guestDeep.id('deep', 'admin'),
    });
    return new DeepClient({deep: guestDeep, ...admin})
}
export async function getLinksFromFile(filename) {
    const data = await readFile('Saves/' + filename, 'utf8');
    return JSON.parse(data)
}

async function insertLinksFromFile(filename, gqllink, linksData, diff=0n) {
    let deep  = await createDeepClient(gqllink)
    try {
        const links = [];
        const objects = [];
        const numbers = [];
        const strings = [];

        for (let i = 0; i < linksData.length; i++) {
            const link = linksData[i];
            links.push({
                id: link.id + diff,
                from_id: link.from_id + diff,
                to_id: link.to_id + diff,
                type_id: link.type_id
            });

            if (link.string) {
                strings.push(link.string);
            }

            if (link.number) {
                numbers.push(link.number);
            }

            if (link.object) {
                objects.push(link.object);
            }
        }

        await deep.serial({
            operations: [
                {
                    table: 'links',
                    type: 'insert',
                    objects: links
                },
                {
                    table: 'objects',
                    type: 'insert',
                    objects: objects
                },
                {
                    table: 'numbers',
                    type: 'insert',
                    objects: numbers
                },
                {
                    table: 'strings',
                    type: 'insert',
                    objects: strings
                }
            ]
        });

        console.log('Data inserted successfully');
    } catch (error) {
        console.error(error);
    }
}

export {insertLinksFromFile}