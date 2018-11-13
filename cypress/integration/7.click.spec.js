/// <reference types="Cypress" />

import { moveGutter, checkSplitDirAndSizes } from '../support/splitUtils'


context('Gutter click example page tests', () => {
    const W = 1070;
    const H = 300;
    const GUTTER = 10;
    
    beforeEach(() => {
        cy.visit('/#/examples/gutter-click-roll-unroll')
    })

    it('Display initial state', () => {
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [263, 525, 262]);
    })
    
    it('Click gutters to switch area sizes between 0 and X', () => {
        cy.get('as-split-gutter').eq(0).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 788, 262]);

        cy.get('as-split-gutter').eq(0).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [263, 525, 262]);

        cy.get('as-split-gutter').eq(0).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 788, 262]);

        cy.get('as-split-gutter').eq(1).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 1050, 0]);

        cy.get('as-split-gutter').eq(0).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [263, 787, 0]);

        cy.get('as-split-gutter').eq(1).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [263, 525, 262]);

        cy.get('.logs ul li').should('have.length', 6);
    })
    
    it('Mix gutter click and dragging', () => {
        moveGutter('as-split-gutter', 0, -100, 0);
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [263, 525, 262]);
        cy.get('.logs ul li').should('have.length', 0);

        cy.get('.btns button').eq(1).click();

        moveGutter('as-split-gutter', 0, -100, 0);
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [163, 624, 263]);

        cy.get('.logs ul li').should('have.length', 6);
        
        cy.get('as-split-gutter').eq(0).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 788, 262]);
        cy.get('.logs ul li').should('have.length', 8);

        cy.get('as-split-gutter').eq(1).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 1050, 0]);
        cy.get('.logs ul li').should('have.length', 10);
        
        moveGutter('as-split-gutter', 1, -20, 0);
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 1030, 20]);
        cy.get('.logs ul li').should('have.length', 16);

        cy.get('as-split-gutter').eq(1).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [0, 788, 262]);
        cy.get('.logs ul li').should('have.length', 18);

        cy.get('as-split-gutter').eq(0).click();
        checkSplitDirAndSizes('.split-example > as-split', 'horizontal', W, H, GUTTER, [263, 525, 262]);
        cy.get('.logs ul li').should('have.length', 20);

    })


})
