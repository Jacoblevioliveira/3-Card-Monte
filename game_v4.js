document.addEventListener('DOMContentLoaded', () => {
    const cards = Array.from(document.querySelectorAll('.card'));
    const instruction = document.getElementById('instruction');
    const result = document.getElementById('result');
    const actionButton = document.getElementById('action-button');
    const questionContainer = document.getElementById('question-container');
    const submitAnswerButton = document.getElementById('submit-answer-button');
    const choiceReasonInputs = document.querySelectorAll('input[name="choiceReason"]');

    const questionFrequency = 1; // Set this to control how often the question appears
    const roundSequence = Array(25).fill('S').concat(Array(25).fill('R')).concat(Array(25).fill('S'));
    let roundIndex = 0;
    let gamePhase = 'reveal';
    let cardSelected = false;
    let shuffleCount = 0;
    const maxShuffles = 25;
    const positions = ['-150px', '0px', '150px'];

    function updateButton(text, color, isEnabled) {
        actionButton.textContent = text;
        actionButton.style.backgroundColor = color;
        actionButton.disabled = !isEnabled;
    }

    function resetGame() {
        const roundType = roundSequence[roundIndex % roundSequence.length];
        const isRandomRound = (roundType === 'R');
        shuffleCount = 0;
        cardSelected = false;

        let greenCardIndex = Math.floor(Math.random() * 3);
        cards.forEach((card, index) => {
            card.classList.remove('flipped');
            card.style.transform = `translateX(${positions[index]})`;
            card.dataset.color = (index === greenCardIndex) ? 'green' : 'red';
            card.querySelector('.card-back').style.backgroundColor = 'black';
        });

        result.textContent = '';
        gamePhase = 'reveal';
        instruction.textContent = 'Click "Reveal" to start!';
        updateButton('Reveal Cards', 'green', true);

        roundIndex++; // Move to the next round in sequence
        questionContainer.classList.remove('visible'); // Ensure question box is hidden at the start
    }

    function shouldShowQuestionPhase() {
        return questionFrequency > 0 && roundIndex % questionFrequency === 0;
    }

    function getPositionLabel(index) {
        return index === 0 ? "Left" : index === 1 ? "Middle" : "Right";
    }

    function revealCards() {
        if (gamePhase !== 'reveal') return;

        gamePhase = 'revealing';
        updateButton('Revealing...', 'grey', false);

        cards.forEach(card => {
            card.classList.add('flipped');
            card.querySelector('.card-back').style.backgroundColor = card.dataset.color;
        });

        setTimeout(() => {
            hideCards();
            setTimeout(() => {
                gamePhase = 'readyToShuffle';
                updateButton('Shuffle', 'blue', true);
                instruction.textContent = 'Click "Shuffle" to shuffle the cards!';
            }, 1000);
        }, 2000);
    }

    function hideCards() {
        cards.forEach(card => {
            card.classList.remove('flipped');
            setTimeout(() => {
                card.querySelector('.card-back').style.backgroundColor = 'black';
            }, 600);
        });
    }

    function shuffleCards() {
        if (gamePhase !== 'readyToShuffle') return;

        gamePhase = 'shuffling';
        updateButton('Shuffling...', 'grey', false);
        instruction.textContent = 'Shuffling...';

        function performShuffle() {
            if (shuffleCount >= maxShuffles) {
                const currentRoundType = roundSequence[(roundIndex - 1) % roundSequence.length];
                if (currentRoundType === 'R') {
                    stackAndUnstack();
                } else {
                    finishShuffle();
                }
                return;
            }

            const index1 = Math.floor(Math.random() * 3);
            let index2;
            do {
                index2 = Math.floor(Math.random() * 3);
            } while (index1 === index2);

            const card1 = cards[index1];
            const card2 = cards[index2];
            const tempTransform = card1.style.transform;

            card1.style.transform = card2.style.transform;
            card2.style.transform = tempTransform;
            [cards[index1], cards[index2]] = [cards[index2], cards[index1]];

            shuffleCount++;
            setTimeout(performShuffle, 300);
        }

        performShuffle();
    }

    function stackAndUnstack() {
        const targetIndex = Math.floor(Math.random() * 3);
        const stackTargetPosition = positions[targetIndex];

        cards.forEach((card, index) => {
            const distance = Math.abs(targetIndex - index);
            const delay = distance * 150;
            setTimeout(() => {
                card.style.transition = 'transform 0.4s ease';
                card.style.transform = `translateX(${stackTargetPosition})`;
            }, delay);
        });

        setTimeout(() => {
            cards.forEach((card, index) => {
                card.style.transition = 'transform 0.4s ease';
                card.style.transform = `translateX(${positions[index]})`;
            });
            setTimeout(finishShuffle, 1000);
        }, 1000 + 150);
    }

    function finishShuffle() {
        gamePhase = 'guess';
        updateButton('Select the Green Card', 'green', false);
        instruction.textContent = 'Pick a card!';
    }

    function revealCard(card) {
        if (gamePhase !== 'guess' || cardSelected) return;

        cardSelected = true;
        const currentRoundType = roundSequence[(roundIndex - 1) % roundSequence.length];
        const selectedCardIndex = cards.indexOf(card);
        let playerWins;

        if (currentRoundType === 'R') {
            const randomOutcome = Math.random() < 0.33;
            playerWins = randomOutcome;
            
            if (randomOutcome) {
                card.dataset.color = 'green';
                cards.forEach((c, i) => {
                    if (i !== selectedCardIndex) c.dataset.color = 'red';
                });
            } else {
                card.dataset.color = 'red';
                let otherGreenIndex;
                do {
                    otherGreenIndex = Math.floor(Math.random() * 3);
                } while (otherGreenIndex === selectedCardIndex);

                cards.forEach((c, i) => {
                    c.dataset.color = (i === otherGreenIndex) ? 'green' : 'red';
                });
            }
        } else {
            playerWins = (card.dataset.color === 'green');
        }

        if (shouldShowQuestionPhase()) {
            showQuestionDialog(playerWins, selectedCardIndex);
        } else {
            setTimeout(() => revealOutcome(playerWins, selectedCardIndex), 1000);
        }
    }

    function showQuestionDialog(playerWins, selectedCardIndex) {
        questionContainer.classList.add('visible');
        choiceReasonInputs.forEach(input => input.checked = false);

        submitAnswerButton.onclick = () => {
            const selectedReason = Array.from(choiceReasonInputs).find(input => input.checked)?.value;

            if (selectedReason) {
                console.log(`Answer logged: ${selectedReason}`);
                questionContainer.classList.remove('visible');
                logRoundData(
                    roundSequence[(roundIndex - 1) % roundSequence.length],
                    selectedCardIndex,
                    cards.findIndex(card => card.dataset.color === 'green'),
                    playerWins,
                    selectedReason
                );
                setTimeout(() => revealOutcome(playerWins, selectedCardIndex), 1000);
            } else {
                alert("Please select an answer before submitting.");
            }
        };
    }

    function revealOutcome(playerWins, selectedCardIndex) {
        result.textContent = playerWins ? 'You win! 🎉' : 'Wrong choice! Try again.';

        cards.forEach(c => {
            c.classList.add('flipped');
            c.querySelector('.card-back').style.backgroundColor = c.dataset.color;
        });

        setTimeout(resetGame, 3000); // Reset game after revealing result
    }

    function logRoundData(roundType, selectedCard, actualGreenCard, playerWins, choiceReason) {
        const roundTypeLabel = roundType === 'S' ? 'Skill' : 'Random';
        const selectedCardLabel = getPositionLabel(selectedCard);
        const actualGreenCardLabel = getPositionLabel(actualGreenCard);

        const data = {
            participantId: "player123",
            roundType: roundTypeLabel,
            selectedCard: selectedCardLabel,
            greenCardLocation: actualGreenCardLabel,
            greenCardSelected: playerWins,
            choiceReason
        };

        fetch('http://localhost:3000/log-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => console.log("Data logged successfully:", data.status))
        .catch(error => console.error('Error logging data:', error));
    }

    actionButton.onclick = () => {
        if (gamePhase === 'reveal') {
            revealCards();
        } else if (gamePhase === 'readyToShuffle') {
            shuffleCards();
        }
    };

    cards.forEach(card => {
        card.onclick = () => {
            if (gamePhase === 'guess') revealCard(card);
        };
    });

    resetGame();
});
