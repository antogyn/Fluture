# Benchmarks

## Running

* Install node modules required for the benchmark you wish to run
* Use `npm run bench -- --help` for options

For example, let's say you like to know how the performance of `parallel`
compares to what it was at version 5.x:

```sh
cd bench
npm i fluture@5.x
cd ..
npm run bench -- --benchmark fluture --match *.parallel.*
```
