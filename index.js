require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_KEY)
const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_ADMIN_NODE_URL,
	process.env.NEXT_PUBLIC_SUPABASE_ADMIN_NODE_KEY
)

// Example batch size
// Define the batch size for pagination
const pageSize = 4000

const PRODUCT_TABLE = 'shopify_product_lookup'
const RELATIONAL_TABLE = 'shopify_relation_product'
const MODEL_TABLE = 'shopify_model'
const MAKE_TABLE = 'shopify_make'
const TYPE_TABLE = 'Type'
const YEARS_TABLE = 'Years'

async function fetchAndUploadData() {
	let pageIndex = 0
	let hasMore = true

	while (hasMore) {
		let {
			data: readData,
			error: readError,
			count,
		} = await supabase
			.from('reviews-2') // Replace 'source_table' with your source table name
			.select('*', { count: 'exact' })
			.order('id', { ascending: true }) // Ensure consistent ordering by a unique column
			.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)

		if (readError) {
			console.error('Error fetching data:', readError)
			return
		}

		if (readData.length === 0) {
			hasMore = false // Stop the loop if no more data is returned
		} else {
			console.log(`Fetched ${readData.length} records in batch ${pageIndex + 1}.`)

			// Upload each batch to the destination table
			let { data: insertData, error: insertError } = await supabaseAdmin
				.from('reviews-3') // Replace 'destination_table' with your target table name
				.insert(readData)

			if (insertError) {
				console.error('Error inserting data:', insertError)
				return
			}

			console.log(`Data inserted for batch ${pageIndex + 1}:`, insertData)
			pageIndex++ // Increment to fetch the next batch
		}
	}
}

async function createRelationalTable() {
	const pageSize = 4000
	const { data: models, error: modelError } = await supabaseAdmin.from(MODEL_TABLE).select('id, name')
	// Check if the make exists
	const { data: makes, error: makeError } = await supabaseAdmin.from(MAKE_TABLE).select('id, name')
	const { data: types, error } = await supabaseAdmin.from(TYPE_TABLE).select('id, name')

	const { data: years, error: err_date } = await supabaseAdmin.from(YEARS_TABLE).select('id, name')

	let pageIndex = 0
	let hasMore = true

	while (hasMore) {
		let {
			data: products,
			error,
			count,
		} = await supabaseAdmin
			.from(PRODUCT_TABLE)
			.select('id, sku,make,model,year,type')
			.order('id', { ascending: true })
			.range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
		console.log(`Retrieving Products...(${pageIndex * pageSize}, ${(pageIndex + 1) * pageSize - 1})`)
		if (error) {
			console.error('Error fetching products:', error)
			break // Stop processing on error
		}

		// For each product
		if (products.length === 0) {
			console.log('Products.length is 0, setting has more to false')
			hasMore = false
			break
		}

		await prepareAndBatchInsertData(products, makes, models, years, types)
		console.log(`Data inserted for batch ${pageIndex + 1}:`)

		if (products.length < pageSize) {
			console.log('Products.length is less than page size, setting has more to false')

			hasMore = false // No more pages left to fetch
		} else {
			pageIndex++ // Prepare for the next page
		}
		//   if (date?.id && type?.id && make?.id && model?.id) {
		//     //   const { data: existingRelation, error: relationError } = await supabaseAdmin
		//     //     .from("relations_product")
		//     //     .select("id")
		//     //     .eq("year_id", date.id)
		//     //     .eq("model_id", model?.id)
		//     //     .eq("make_id", make.id)
		//     //     .eq("type_id", type.id)
		//     //     .eq("product_id", item);

		//     // If the combination already exists, log a message or handle it as needed
		//     if (existingRelation && existingRelation.length > 0) {
		//       console.log("Combination of IDs already exists in the database.");
		//     } else {
		//       // If the combination doesn't exist, insert the new data
		//     }
		//   }
	}
}

async function prepareAndBatchInsertData(products, makes, models, years, types) {
	let inserts = []
	let insertCount = 0
	const batchSize = 1000

	for (const product of products) {
		let row = {
			product_id: 0,
			type_id: 0,
			year_id: 0,
			make_id: 0,
			model_id: 0,
		}
		row.product_id = product.id
		row.type_id = 1 // only have car cover now would need to look against type table too if this isn't valid

		// Find make_id
		const make = makes.find((m) => m.name === product.make)
		if (make) {
			row.make_id = make.id
		}

		// Find model_id
		const model = models.find((m) => m.name === product.model)
		if (model) {
			row.model_id = model.id
		}

		// Find type_id
		const type = types.find((m) => m.name === product.type)
		if (type) {
			row.type_id = type.id
		}

		const [startYear, endYear] = product.year.split('-').map((year) => parseInt(year))
		if (!endYear) {
			const yearObj = years.find((y) => y.name === startYear.toString())
			row.year_id = yearObj.id
			inserts.push(row)
		}
		for (let year = startYear; year <= endYear; year++) {
			const yearObj = years.find((y) => y.name === year.toString())
			if (yearObj) {
				row.year_id = yearObj.id
				// Assuming you might want a separate row for each year within the range
				let newRow = { ...row, year_id: yearObj.id }
				inserts.push(newRow)

				// Check if the batch should be inserted
				if (inserts.length >= batchSize) {
					console.log(`Batch size has been reached, inserting: ${inserts.length} records`)
					insertCount += inserts.length
					await batchInsert(inserts)
					inserts = [] // Reset the batch after inserting
				}
			}
		}
	}

	if (inserts.length > 0) {
		console.log(`Found some leftover, inserting: ${inserts.length} records`)
		insertCount += inserts.length
		await batchInsert(inserts)
	}
	console.log(`Reached end of program. Inserted ${insertCount} records`)
}

async function batchInsert(rows) {
	const { data: relation_data, error: relationInsertError } = await supabaseAdmin.from(RELATIONAL_TABLE).insert(rows)
	if (relationInsertError) {
		console.log(relationInsertError)
		// ID : 14452
	}
}
// fetchAndUploadData();
createRelationalTable()
