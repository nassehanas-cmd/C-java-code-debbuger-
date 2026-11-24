import { DebugAnalysisResult, ExplanationLanguage } from '../types';

export const BUGGY_C_EXAMPLE = `#include <stdio.h>
#include <stdlib.h>

// Calculate average of n scores and print highest score
int main() {
    int n = 5;
    int *scores = (int*)malloc(n * sizeof(int));
    scores[0] = 85;
    scores[1] = 92;
    scores[2] = 78;
    scores[3] = 95;
    scores[4] = 88

    int sum = 0;
    int maxScore = 0;

    for (int i = 0; i <= n; i++) {
        sum += scores[i];
        if (scores[i] > maxScore) {
            maxScore = scores[i];
        }
    }

    float average = sum / n;
    printf("Average score: %f\\n", average);
    printf("Highest score: %d\\n", maxScore);

    return 0;
}`;

export const BUGGY_C_CONTEXT =
  'Allocate an array of 5 student scores, compute the exact floating-point average and highest score, print them, and free allocated memory cleanly.';

export const BUGGY_JAVA_EXAMPLE = `import java.util.*;

public class UserDirectory {
    public static void main(String[] args) {
        List<String> users = new ArrayList<>();
        users.add("Amine");
        users.add("Sarah");
        users.add(null);
        users.add("Youssef");

        String target = new String("Sarah");
        int foundIndex = -1;

        for (int i = 0; i <= users.size(); i++) {
            String current = users.get(i);
            if (current.toUpperCase().equals("ADMIN")) {
                System.out.println("Admin user found")
            }
            if (current == target) {
                foundIndex = i;
            }
        }

        System.out.println("Target found at index: " + foundIndex);
    }
}`;

export const BUGGY_JAVA_CONTEXT =
  'Search a list of user names (which may contain null entries) for "Sarah" and check if any user is "ADMIN" without throwing NullPointerException or IndexOutOfBoundsException.';

export const CLEAN_C_EXAMPLE = `#include <stdio.h>

int main(void) {
    int a = 10;
    int b = 20;
    printf("Sum: %d\\n", a + b);
    return 0;
}`;

export function getPrecomputedCAnalysis(lang: ExplanationLanguage): DebugAnalysisResult {
  const isFr = lang === 'French';
  const isDarija = lang === 'Moroccan Darija';

  return {
    isValidCodeInput: true,
    detectedLanguage: 'C',
    summary: isFr
      ? 'Le programme C comporte 1 erreur de syntaxe, 1 erreur logique (division entière) et 2 problèmes mémoire/exécution (dépassement de tableau et fuite mémoire).'
      : isDarija
      ? 'Had l-code dyal C fih 1 ghalat dyal syntax (naqsa point-virgule), 1 ghalat logique f l-qisma dyal average, w 2 machakil dyal mémoire (off-by-one f boucle w nssiti free).'
      : 'The C program contains 1 syntax error, 1 logical error (integer division truncation), and 2 runtime/memory issues (out-of-bounds array read and memory leak).',
    errors: [
      {
        type: 'Syntax',
        line: '13',
        snippet: 'scores[4] = 88',
        explanation: isFr
          ? 'Point-virgule (;) manquant à la fin de l’instruction d’affectation.'
          : isDarija
          ? 'Naqsa point-virgule (;) f lekher dyal sster 13. L-compilateur ديال C ghadi y3ti erreur.'
          : 'Missing semicolon (;) at the end of the assignment statement, which prevents compilation.',
        fix: 'scores[4] = 88;',
      },
      {
        type: 'Runtime/Memory',
        line: '18-19',
        snippet: 'for (int i = 0; i <= n; i++) {\n    sum += scores[i];',
        explanation: isFr
          ? 'Condition de boucle hors limites (i <= n). Pour un tableau de taille 5, les indices valides vont de 0 à 4. L’accès à scores[5] lit une mémoire non initialisée (comportement indéfini).'
          : isDarija
          ? 'Condition dyal boucle `i <= n` katkhrej 3la l-tableau. L-indices s7a7 homa men 0 tal 4 (`i < n`). Melli katdir `scores[5]` katqra mémoire 3achwa2iya (Undefined Behavior).'
          : 'Off-by-one loop boundary (`i <= n`). Valid indices for a 5-element array are 0 to 4. Accessing `scores[5]` reads out-of-bounds heap memory (Undefined Behavior).',
        fix: 'for (int i = 0; i < n; i++)',
      },
      {
        type: 'Logic',
        line: '25',
        snippet: 'float average = sum / n;',
        explanation: isFr
          ? 'Division entière : `sum` et `n` sont tous deux de type `int`, donc `438 / 5` donne `87` au lieu de `87.6` avant d’être converti en `float`.'
          : isDarija
          ? 'Qisma dyal les entiers: `sum` w `n` bjouj `int`, ya3ni `438 / 5` kat3ti `87` w katضيّع الفاصلة qbel ma t7ewel l `float` (khassha t3ti 87.6).'
          : 'Integer division truncation: both `sum` and `n` are `int`, so `438 / 5` evaluates to `87` instead of `87.6` before being stored in `average`.',
        fix: 'float average = (float)sum / n;',
      },
      {
        type: 'Runtime/Memory',
        line: '29',
        snippet: 'return 0;',
        explanation: isFr
          ? 'Fuite de mémoire (Memory Leak) : la mémoire allouée dynamiquement avec `malloc` pour `scores` n’est jamais libérée avec `free(scores)`.'
          : isDarija
          ? 'Memory leak: l-mémoire lli khditi b `malloc` l `scores` ma rjje3tihach b `free(scores)` qbel `return 0;`.'
          : 'Memory leak: heap memory dynamically allocated via `malloc` for `scores` is never released with `free(scores)` before exiting `main`.',
        fix: 'free(scores);\nreturn 0;',
      },
    ],
    correctedCode: `#include <stdio.h>
#include <stdlib.h>

// Calculate average of n scores and print highest score
int main(void) {
    int n = 5;
    int *scores = (int*)malloc(n * sizeof(int));
    if (scores == NULL) {
        return 1;
    }

    scores[0] = 85;
    scores[1] = 92;
    scores[2] = 78;
    scores[3] = 95;
    scores[4] = 88;

    int sum = 0;
    int maxScore = scores[0];

    for (int i = 0; i < n; i++) {
        sum += scores[i];
        if (scores[i] > maxScore) {
            maxScore = scores[i];
        }
    }

    float average = (float)sum / n;
    printf("Average score: %.2f\\n", average);
    printf("Highest score: %d\\n", maxScore);

    free(scores);
    return 0;
}`,
    executionComparison: {
      sampleInput: 'scores = [85, 92, 78, 95, 88], n = 5',
      buggyBehavior:
        'Fails to compile at line 13 (error: expected ";" before "int"). Even if semicolon is added, reads garbage heap memory at scores[5], truncates 438 / 5 to 87.000000, and leaks 20 bytes of heap memory.',
      expectedFixedOutput: 'Average score: 87.60\nHighest score: 95',
    },
  };
}

export function getPrecomputedJavaAnalysis(lang: ExplanationLanguage): DebugAnalysisResult {
  const isFr = lang === 'French';
  const isDarija = lang === 'Moroccan Darija';

  return {
    isValidCodeInput: true,
    detectedLanguage: 'Java',
    summary: isFr
      ? 'La classe Java contient 1 erreur de syntaxe, 1 erreur logique (comparaison de chaînes avec ==) et 2 erreurs d’exécution (NullPointerException et IndexOutOfBoundsException).'
      : isDarija
      ? 'Had l-code dyal Java fih 1 ghalat dyal syntax, 1 ghalat logique (`==` بلاصة `.equals()`), w 2 erreurs f runtime (`NullPointerException` w `IndexOutOfBoundsException`).'
      : 'The Java class contains 1 syntax error, 1 logical error (reference equality `==` on Strings), and 2 runtime exceptions (`NullPointerException` and `IndexOutOfBoundsException`).',
    errors: [
      {
        type: 'Syntax',
        line: '18',
        snippet: 'System.out.println("Admin user found")',
        explanation: isFr
          ? 'Point-virgule (;) manquant à la fin de l’appel `System.out.println(...)`.'
          : isDarija
          ? 'Naqsa point-virgule (;) f lekher dyal `System.out.println("Admin user found")`.'
          : 'Missing semicolon (;) at the end of the `System.out.println` statement.',
        fix: 'System.out.println("Admin user found");',
      },
      {
        type: 'Runtime/Memory',
        line: '15',
        snippet: 'for (int i = 0; i <= users.size(); i++)',
        explanation: isFr
          ? 'Condition de boucle `i <= users.size()` provoque une `IndexOutOfBoundsException` lors du dernier tour car le dernier indice valide est `users.size() - 1`.'
          : isDarija
          ? 'Condition `i <= users.size()` kat3ti `IndexOutOfBoundsException` hit akher index s7i7 f List howa `users.size() - 1` (`i < users.size()`).'
          : 'Loop condition `i <= users.size()` throws an `IndexOutOfBoundsException` on the final iteration because valid list indices are `0` to `users.size() - 1`.',
        fix: 'for (int i = 0; i < users.size(); i++)',
      },
      {
        type: 'Runtime/Memory',
        line: '17',
        snippet: 'if (current.toUpperCase().equals("ADMIN"))',
        explanation: isFr
          ? 'Risque de `NullPointerException` : l’élément à l’indice 2 est `null`, donc appeler `current.toUpperCase()` sans vérifier `current != null` fait planter le programme.'
          : isDarija
          ? '`NullPointerException`: l-élément f index 2 howa `null`. Melli kat3eyyet l `current.toUpperCase()` bla ma t-checki `current != null`, l-programme kayt-crasha.'
          : '`NullPointerException` hazard: `users` contains a `null` entry at index 2. Invoking `current.toUpperCase()` without a null check crashes at runtime.',
        fix: 'if (current != null && current.equalsIgnoreCase("ADMIN"))',
      },
      {
        type: 'Logic',
        line: '20',
        snippet: 'if (current == target)',
        explanation: isFr
          ? 'En Java, l’opérateur `==` compare les références mémoire des objets `String` et non leur contenu textuel. Comme `target` est créé avec `new String("Sarah")`, `current == target` renvoie `false`.'
          : isDarija
          ? 'F Java, `==` katqaren l-adresse mémoire machi l-ktaba lli وسط `String`. Hit `target` tssawbat b `new String("Sarah")`, `current == target` kat3ti `false`. Khassk tsta3mel `target.equals(current)`.'
          : 'Using `==` compares `String` object references rather than character contents. Because `target` is instantiated via `new String("Sarah")`, `current == target` evaluates to `false` and fails to find `"Sarah"`.',
        fix: 'if (target.equals(current))',
      },
    ],
    correctedCode: `import java.util.*;

public class UserDirectory {
    public static void main(String[] args) {
        List<String> users = new ArrayList<>();
        users.add("Amine");
        users.add("Sarah");
        users.add(null);
        users.add("Youssef");

        String target = "Sarah";
        int foundIndex = -1;

        for (int i = 0; i < users.size(); i++) {
            String current = users.get(i);
            if (current == null) {
                continue;
            }
            if (current.equalsIgnoreCase("ADMIN")) {
                System.out.println("Admin user found");
            }
            if (target.equals(current)) {
                foundIndex = i;
            }
        }

        System.out.println("Target found at index: " + foundIndex);
    }
}`,
    executionComparison: {
      sampleInput: 'users = ["Amine", "Sarah", null, "Youssef"], target = "Sarah"',
      buggyBehavior:
        'Fails to compile at line 18 (`; expected`). If semicolon is added, fails to match "Sarah" at index 1 due to `==` reference check, and crashes at index 2 with `java.lang.NullPointerException: Cannot invoke "String.toUpperCase()" because "current" is null`.',
      expectedFixedOutput: 'Target found at index: 1',
    },
  };
}
