
const $globalA = 'something global';

const $globalB = (() => {
    console.log( $globalA );
    console.log($globalA);
    console.log('GHLOBAL BEE');
});