import * as trpc from '@trpc/server'
import { ProductToken } from '@blockchain-carbon-accounting/data-postgres/src/models/productToken';
import { ethers } from 'ethers';
import { z } from 'zod'
import { handleError, TrpcContext } from './common';

export const zQueryBundles = z.array(z.object({
    field: z.string(),
    fieldType: z.string(),
    value: z.string().or(z.number()),
    op: z.string(),
}))


const validAddress = z.string().refine((val) => ethers.utils.isAddress(val), {
    message: "Address must be a valid Ethereum address",
})


export const productTokenRouter = trpc
.router<TrpcContext>()
.query('count', {
    input: z.object({
        bundles: zQueryBundles.default([]),
    }).default({}),
    async resolve({ input, ctx }) {
        try {
            return {
                count: await ctx.db.getProductTokenRepo().countProducts(input.bundles) 
            }
        } catch (error) {
            handleError('count', error)
        }
    },
})
.query('list', {
    input: z.object({
        bundles: zQueryBundles.default([]),
        offset: z.number().gte(0).default(0),
        limit: z.number().gt(0).default(10)
    }).default({}),
    async resolve({ input, ctx }) {
        try {
            const products = await ctx.db.getProductTokenRepo().selectPaginated(input.offset, input.limit, input.bundles);
            const count = await ctx.db.getProductTokenRepo().countProducts(input.bundles);
            return {
                count,
                products: ProductToken.toRaws(products)
            }
        } catch (error) {
            handleError('list', error)
        }
    },
})
.mutation('insert', {
    input: z.object({
        productId: z.number(),
        trackerId: z.number(),
        auditor: validAddress,
        amount: z.bigint(),
        available: z.bigint(),
        name: z.string(),
        unit: z.string(),
        unitAmount: z.bigint(),
        hash: z.string(),
    }),
    async resolve({ input, ctx }) {
        try {
            // make sure the address is in the proper checksum format
            //const address = ethers.utils.getAddress(input.address);
            // note: use mergeWallet which allows updating an existing entry
            //const {address: _address, ...data} = input
            const product = await ctx.db.getProductTokenRepo().insertProductToken(input);

            return {
                product: ProductToken.toRaw(product)
            }
        } catch (error) {
            handleError('register', error)
        }
    },
})
export type ProductTokenRouter = typeof productTokenRouter 

