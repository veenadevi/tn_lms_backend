import express from "express"
import Book from "../models/Book.js"
import BookCategory from "../models/BookCategory.js"

const router = express.Router()

// Helper: convert Decimal128 / {$numberDecimal: "..."} -> plain string
// const normalizeBook = (book) => {
//     let obj = book
//     if (book && typeof book.toObject === "function") obj = book.toObject()
//     else obj = { ...book }

//     // if (obj && obj.bookPrice != null) {
//     //     if (obj.bookPrice && obj.bookPrice.$numberDecimal) {
//     //         obj.bookPrice = obj.bookPrice.$numberDecimal
//     //     } else if (typeof obj.bookPrice.toString === "function") {
//     //         obj.bookPrice = obj.bookPrice.toString()
//     //     } else {
//     //         obj.bookPrice = String(obj.bookPrice)
//     //     }
//     // }
//     return obj
// }

/* Get all books in the db */
router.get("/allbooks", async (req, res) => {
    try {
        const books = await Book.find({})
            .populate("transactions")
            .populate("categories")
            .sort({ _id: -1 });
        res.status(200).json(books);
    } catch (err) {
        return res.status(504).json(err);
    }
})

/* Get Book by book Id */
router.get("/getbook/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate("transactions")
        res.status(200).json(book)
    }
    catch {
        return res.status(500).json(err)
    }
})

/* Get books by category name*/
router.get("/", async (req, res) => {
    const category = req.query.category
    try {
        const books = await BookCategory.findOne({ categoryName: category }).populate("books")
        res.status(200).json(books)
    }
    catch (err) {
        return res.status(504).json(err)
    }
})

/* Adding book */
router.post("/addbook", async (req, res) => {
   

    try {
        // Accept body as: array, { books: [...] } or single book object
        let rawInput
        console.log(" req.body===", req.body)
        if (Array.isArray(req.body)) rawInput = req.body
        else if (Array.isArray(req.body.books)) rawInput = req.body.books
        else rawInput = [req.body]

        // Capture admin flag from top-level or first item BEFORE we strip it
        const isAdmin = req.body.isAdmin ?? rawInput[0]?.isAdmin ?? false

        // Remove any isAdmin flags from individual items for safety
        const booksInput = rawInput.map(b => {
            const copy = { ...b }
            delete copy.isAdmin
            return copy
        })

        // Find the largest existing bookId
        const lastBook = await Book.findOne({}, {}, { sort: { bookId: -1 } })
        let nextBookId = lastBook && lastBook.bookId ? lastBook.bookId + 1 : 1

        // Determine incoming names and existing duplicates
        const incomingNames = booksInput.map(b => b.bookName).filter(Boolean)
        const existingNames = incomingNames.length
            ? await Book.find({ bookName: { $in: incomingNames } }).distinct('bookName')
            : []
        const skipped = []

        console.log("booksInput.length===", booksInput.length)

        if (booksInput.length === 1) {
            const b = booksInput[0]

            if (!isAdmin) {
                return res.status(403).json("You dont have permission to add a book!");
            }

            if (existingNames.includes(b.bookName)) {
                // Skip duplicate single book
                return res.status(200).json({ message: 'Skipped duplicate bookName', skipped: [b.bookName] })
            }

            const newbook = new Book({
                bookName: b.bookName,
                bookId: nextBookId,
                alternateTitle: b.alternateTitle,
                author: b.author,
                contributor:b.contributor,
                bookCountAvailable: b.bookCountAvailable,
                language: b.language,
                bookPrice: b.bookPrice,
                publisher: b.publisher,
                donatedBy: b.donatedBy,
                bookStatus: b.bookStatus,
                categories: b.categories
            })
            const saved = await newbook.save()
            await BookCategory.updateMany({ '_id': saved.categories }, { $push: { books: saved._id } })

            return res.status(200).json({ inserted: [saved], skipped: [] })
        } else {
            console.log("booksInput array", booksInput.length)
            if (!isAdmin) {
                return res.status(403).json("I dont have permission to add a book!");
            } else {

                // Filter out duplicates
                const uniqueInputs = booksInput.filter(b => {
                    if (!b.bookName) return false
                    if (existingNames.includes(b.bookName)) {
                        skipped.push(b.bookName)
                        return false
                    }
                    return true
                })

                if (uniqueInputs.length === 0) {
                    return res.status(200).json({ inserted: [], skipped })
                }

                // Multiple books
                const docs = uniqueInputs.map(b => ({
                    bookName: b.bookName,
                    bookId: nextBookId++,
                    alternateTitle: b.alternateTitle,
                    author: b.author,
                    contributor:b.contributor,
                    bookCountAvailable: b.bookCountAvailable,
                    language: b.language,
                    bookPrice: b.bookPrice,
                    publisher: b.publisher,
                    donatedBy: b.donatedBy,
                    bookStatus: b.bookStatus,
                    categories: b.categories
                }))

                const inserted = await Book.insertMany(docs)

                // Update categories for each inserted book
                await Promise.all(
                    inserted.map(book => BookCategory.updateMany({ '_id': book.categories }, { $push: { books: book._id } }))
                )

                //const normalized = inserted.map(normalizeBook)
                return res.status(200).json({ inserted: inserted, skipped })
            }
        }
    } catch (err) {
        return res.status(504).json(err)
    }
})

/* Addding book */
router.put("/updatebook/:id", async (req, res) => {
    if (req.body.isAdmin) {
        try {
            await Book.findByIdAndUpdate(req.params.id, {
                $set: req.body,
            });
            res.status(200).json("Book details updated successfully");
        }
        catch (err) {
            res.status(504).json(err);
        }
    }
    else {
        return res.status(403).json("You dont have permission to delete a book!");
    }
})

/* Remove book  */
router.delete("/removebook/:id", async (req, res) => {
    if (req.body.isAdmin) {
        try {
            const _id = req.params.id
            const book = await Book.findOne({ _id })
            await book.remove()
            await BookCategory.updateMany({ '_id': book.categories }, { $pull: { books: book._id } });
            res.status(200).json("Book has been deleted");
        } catch (err) {
            return res.status(504).json(err);
        }
    } else {
        return res.status(403).json("You dont have permission to delete a book!");
    }
})

export default router